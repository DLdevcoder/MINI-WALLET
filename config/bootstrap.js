const fs = require('fs');
const path = require('path');

module.exports.bootstrap = async function (cb) {
  try {
    // 1. Kiểm tra xem DB đã có dữ liệu chưa
    const pocketCount = await Pocket.count();
    if (pocketCount > 0) {
      console.log('Dữ liệu đã tồn tại, bỏ qua bước Seed.');
      return cb(); // Khởi động xong
    }

    const seedPath = path.resolve(__dirname, '../seed.json');
    if (!fs.existsSync(seedPath)) {
      console.log('Cảnh báo: Không tìm thấy file seed.json');
      return cb();
    }

    const seedData = JSON.parse(fs.readFileSync(seedPath, 'utf8'));

    // 2. Nạp dữ liệu Pockets
    if (seedData.Pockets && seedData.Pockets.length > 0) {
      const pocketsToCreate = seedData.Pockets.map(p => ({
        // Bỏ qua id nếu để DB tự sinh, hoặc giữ nguyên nếu muốn ép id là chuỗi
        client: p.clientType,
        currency: p.currency,
        balance: p.balance,
        checksum: p.checksum
      }));
      await Pocket.createEach(pocketsToCreate);
      console.log(`Đã nạp ${pocketsToCreate.length} ví nền tảng.`);
    }

    // 3. Nạp dữ liệu Services
    if (seedData.Services && seedData.Services.length > 0) {
      for (const srv of seedData.Services) {
        const createdService = await Service.create({
          code: srv.code,
          name: srv.name,
          action: srv.action,
          auth: srv.auth,
          fee: srv.fee,
          fieldBuilder: srv.fieldBuilder
        });

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

    // 4. Báo cáo hoàn thành cho Sails
    return cb();

  } catch (err) {
    // Nếu có lỗi, in chi tiết lỗi ra màn hình thay vì [object Object]
    console.error('\n--- LỖI NẠP DỮ LIỆU SEED ---');
    console.error(JSON.stringify(err, null, 2));
    console.error('----------------------------\n');
    return cb(err);
  }
};