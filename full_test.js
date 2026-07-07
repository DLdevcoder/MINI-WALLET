const sails = require('sails');
sails.load({ environment: 'development' }, async (err) => {
    if (err) return console.error(err);
    try {
        console.log("=== BẮT ĐẦU KIỂM THỬ TỔNG THỂ ===");

        // 1. Kiểm tra config dịch vụ
        console.log("\n1. Bật dịch vụ P2P_TRANSFER...");
        let p2pService = await Service.findOne({ code: 'P2P_TRANSFER' });
        if (p2pService) {
            await Service.update({ code: 'P2P_TRANSFER' }, { status: 'active' });
        } else {
            p2pService = await Service.create({
                code: 'P2P_TRANSFER',
                name: 'Chuyển tiền P2P',
                type: 'financial',
                status: 'active'
            });
        }
        console.log("-> Config OK.");

        // 2. Chuẩn bị tài khoản test (A và B)
        console.log("\n2. Chuẩn bị 2 tài khoản (A và B)...");
        let pocketA = await Pocket.find({ client: 'customer' }).limit(1);
        let pocketB = await Pocket.find({ client: 'customer' }).skip(1).limit(1);
        
        if (!pocketA.length || !pocketB.length) {
            console.log("-> Không đủ 2 ví customer để test P2P. Bỏ qua.");
            return;
        }
        
        pocketA = pocketA[0];
        pocketB = pocketB[0];
        
        const userA = await Customer.findOne({ id: pocketA.user });
        const userB = await Customer.findOne({ id: pocketB.user });

        console.log(`-> Ví A (Số dư đầu): ${pocketA.balance}`);
        console.log(`-> Ví B (Số dư đầu): ${pocketB.balance}`);
        
        // 3. Nạp tiền cho A nếu hết tiền
        if(pocketA.balance < 50000) {
            console.log("\n-> Nạp 1,000,000 cho Ví A bằng PocketService...");
            await require('./api/services/PocketService').updatePocketBalance(pocketA.id, 1000000);
        }

        // 4. Test giao dịch
        console.log("\n4. Khởi tạo giao dịch (A chuyển B 50,000)...");
        const reqResult = await require('./api/services/TransactionEngine').processRequest({
            userId: userA.id,
            serviceCode: 'P2P_TRANSFER',
            amount: 50000,
            receiverInfo: userB.phone
        });

        if (reqResult.err !== 200) {
            console.log("-> Giao dịch bị từ chối:", reqResult);
            return;
        }

        console.log("-> Transaction Request OK! TransRefId:", reqResult.data.transRefId);

        console.log("\n5. Confirm & Verify...");
        const confirmResult = await require('./api/services/TransactionEngine').processConfirm({
            userId: userA.id,
            transRefId: reqResult.data.transRefId
        });
        
        const verifyResult = await require('./api/services/TransactionEngine').processVerify({
            userId: userA.id,
            transRefId: reqResult.data.transRefId,
            pinCode: '111111' // giả lập đúng (hoặc bỏ qua check PIN nếu test)
        });

        console.log("-> Transaction Verify Result:", verifyResult.message || verifyResult.err);

        // 6. Kiểm tra số dư cuối
        console.log("\n6. Kiểm tra lại số dư và lịch sử...");
        const finalPocketA = await Pocket.findOne({ id: pocketA.id });
        const finalPocketB = await Pocket.findOne({ id: pocketB.id });
        console.log(`-> Ví A (Số dư cuối): ${finalPocketA.balance}`);
        console.log(`-> Ví B (Số dư cuối): ${finalPocketB.balance}`);
        
        const isADecreased = finalPocketA.balance < pocketA.balance;
        const isBIncreased = finalPocketB.balance > pocketB.balance;
        console.log(`=> Test tăng giảm tiền: ${isADecreased && isBIncreased ? 'PASS' : 'FAIL'}`);

        // 7. Kiểm tra Trails & Transaction History
        const transRecord = await Transaction.findOne({ transRefId: reqResult.data.transRefId });
        const trailRecord = await TransactionTrail.findOne({ transRefId: reqResult.data.transRefId });
        
        console.log(`=> Có lưu Biên lai Transaction: ${transRecord ? 'PASS' : 'FAIL'} (Status: ${transRecord?.status})`);
        console.log(`=> Có lưu Trails ghi nhận các bước: ${trailRecord ? 'PASS' : 'FAIL'}`);
        if(trailRecord) {
            console.log(`   Số bước (Step Log): ${trailRecord.transStepLog.length}`);
        }

        console.log("\n=== HOÀN TẤT KIỂM THỬ ===");

    } catch(e) {
        console.error("LỖI:", e);
    } finally {
        sails.lower();
    }
});
