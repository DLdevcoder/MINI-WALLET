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
              valType: tv.valType || 'balance_check',
              errorCode: tv.errorCode || 'E01',
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
          // Cập nhật fieldBuilder, action, baseTemplate nếu đã thay đổi trong seed.json
          await Service.update({ code: srv.code }, {
            fieldBuilder: srv.fieldBuilder,
            action: srv.action,
            baseTemplate: srv.baseTemplate || 'SINGLE'
          });
          console.log(`Đã cập nhật fieldBuilder của service: ${srv.code}`);
        }
      }
    }

    // 4. Seed Biller (EVN)
    const existingBiller = await Biller.findOne({ billerCode: 'EVN' });
    if (!existingBiller) {
      // Tìm pocket BILLER_EVN đã tạo ở bước 2
      const billerPocket = await Pocket.findOne({ user: 'BILLER_EVN' });
      await Biller.create({
        billerCode: 'EVN',
        name: 'Điện lực EVN (Giả lập)',
        inquiryUrl: 'http://localhost:1337/mock/evn/inquiry',
        paymentUrl: 'http://localhost:1337/mock/evn/payment',
        pocket: billerPocket ? billerPocket.id : null,
        status: 'active'
      });
      console.log('Đã tạo Biller: EVN');
    }

    // 5. Seed MockBill (hoá đơn mẫu để test)
    const mockBills = [
      { billCode: 'EVN001', billerCode: 'EVN', customerName: 'Nguyễn Văn A', amount: 150000 },
      { billCode: 'EVN002', billerCode: 'EVN', customerName: 'Trần Thị B',   amount: 220000 },
      { billCode: 'EVN003', billerCode: 'EVN', customerName: 'Lê Văn C',     amount: 85000  }
    ];
    for (const bill of mockBills) {
      const existing = await MockBill.findOne({ billCode: bill.billCode });
      if (!existing) {
        await MockBill.create(bill);
        console.log(`Đã tạo hoá đơn mẫu: ${bill.billCode} (${bill.amount}đ)`);
      }
    }

    return cb();
  } catch (err) {
    console.error('\n--- LỖI NẠP DỮ LIỆU SEED ---');
    console.error(err);
    return cb(err);
  }
};