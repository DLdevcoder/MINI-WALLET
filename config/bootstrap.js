const fs = require('fs');
const path = require('path');
const bcrypt = require('bcryptjs'); // Đảm bảo bạn đã require bcrypt ở trên cùng

module.exports.bootstrap = async function (cb) {
  try {
    // 1. Kiểm tra và tạo Admin (Luôn chạy nếu chưa có Admin)
    const officerCount = await Officer.count();
    if (officerCount === 0) {
      const salt = bcrypt.genSaltSync(10);
      const passwordHash = bcrypt.hashSync('123456', salt); // Mật khẩu 123456

      await Officer.create({
        username: 'admin',
        passwordHash: passwordHash,
        status: 'active'
      });
      console.log('--- Đã khởi tạo tài khoản Admin mặc định: admin / 123456 ---');
    }

    // 2. Kiểm tra dữ liệu cấu hình (Chỉ nạp nếu chưa có Service nào)
    const serviceCount = await Service.count();
    if (serviceCount > 0) {
      console.log('Cấu hình Services đã tồn tại, bỏ qua bước Seed cấu hình.');
      return cb();
    }

    const seedPath = path.resolve(__dirname, '../seed.json');
    if (!fs.existsSync(seedPath)) {
      console.log('Cảnh báo: Không tìm thấy file seed.json');
      return cb();
    }

    const seedData = JSON.parse(fs.readFileSync(seedPath, 'utf8'));

    // 3. Nạp dữ liệu Pockets
    if (seedData.Pockets && seedData.Pockets.length > 0) {
      const pocketsToCreate = seedData.Pockets.map(p => ({
        id: p.id, // Giữ ID để khớp với config
        client: p.clientType,
        currency: p.currency,
        balance: p.balance,
        checksum: p.checksum
      }));
      await Pocket.createEach(pocketsToCreate);
      console.log(`Đã nạp ${pocketsToCreate.length} ví nền tảng.`);
    }

    // 4. Nạp dữ liệu Services và các cấu hình liên quan
    if (seedData.Services && seedData.Services.length > 0) {
      for (const srv of seedData.Services) {
        const createdService = await Service.create({
          code: srv.code,
          name: srv.name,
          action: srv.action,
          auth: srv.auth,
          fee: srv.fee,
          fieldBuilder: srv.fieldBuilder
        }).fetch(); // Thêm .fetch() để lấy dữ liệu vừa tạo

        if (srv.transField && srv.transField.length > 0) {
          const transFields = srv.transField.map((tf, index) => ({
            service: createdService.id,
            fieldName: tf.fieldName,
            fieldFormat: tf.dataType || 'string',
            regex: tf.regex,
            isRequired: tf.isRequired,
            order: index + 1
          }));
          await TransField.createEach(transFields);
        }

        if (srv.transValidation && srv.transValidation.length > 0) {
          const transVals = srv.transValidation.map((tv, index) => ({
            service: createdService.id,
            validateFunc: tv.funcName,
            validateFields: tv.fields,
            order: index + 1
          }));
          await TransValidation.createEach(transVals);
        }

        if (srv.glSteps && srv.glSteps.length > 0) {
          const formattedGlSteps = srv.glSteps.map(step => ({
            order: step.order,
            amount: step.amount,
            debit: { level: step.debitLevel, target: step.debitTarget },
            credit: { level: step.creditLevel, target: step.creditTarget }
          }));
          await TransDefinition.create({
            service: createdService.id,
            glSteps: formattedGlSteps
          });
        }
      }
      console.log(`Đã nạp cấu hình cho ${seedData.Services.length} dịch vụ.`);
    }

    return cb();
  } catch (err) {
    console.error('\n--- LỖI NẠP DỮ LIỆU SEED ---');
    console.error(err);
    return cb(err);
  }
};