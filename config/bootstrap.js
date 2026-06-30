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

    const seedPath = path.resolve(__dirname, '../seed.json');
    if (!fs.existsSync(seedPath)) {
      console.log('Cảnh báo: Không tìm thấy file seed.json');
      return cb();
    }

    const seedData = JSON.parse(fs.readFileSync(seedPath, 'utf8'));

    // 2. Nạp dữ liệu Pockets (chỉ tạo nếu chưa tồn tại)
    // Dùng trường 'user' làm identifier, KHÔNG dùng custom id
    // vì sails-mongo v0.12 không hỗ trợ custom string id (bị coerce sang NaN)
    if (seedData.Pockets && seedData.Pockets.length > 0) {
      for (const p of seedData.Pockets) {
        const existing = await Pocket.findOne({ user: p.id });
        if (!existing) {
          await Pocket.create({
            user: p.id,       // 'BANK_POCKET_01', 'SYSTEM_FEE', 'BILLER_EVN'
            client: p.clientType,
            currency: p.currency,
            balance: p.balance,
            checksum: p.checksum
          });
          console.log(`Đã tạo ví: ${p.id}`);
        }
      }
    }

    // 3. Nạp / cập nhật Services (upsert theo code)
    if (seedData.Services && seedData.Services.length > 0) {
      for (const srv of seedData.Services) {
        let existingService = await Service.findOne({ code: srv.code });

        if (!existingService) {
          // Tạo mới
          const createdService = await Service.create({
            code: srv.code,
            name: srv.name,
            action: srv.action,
            auth: srv.auth,
            fee: srv.fee,
            fieldBuilder: srv.fieldBuilder
          }); // Sails v0.12: create() trả về record trực tiếp, không dùng .fetch()

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

          console.log(`Đã tạo service: ${srv.code}`);
        } else {
          console.log(`Service đã tồn tại, bỏ qua: ${srv.code}`);
        }
      }
    }

    return cb();
  } catch (err) {
    console.error('\n--- LỖI NẠP DỮ LIỆU SEED ---');
    console.error(err);
    return cb(err);
  }
};