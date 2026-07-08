async function runTest() {
    try {
        console.log("=== BẮT ĐẦU KIỂM THỬ TỔNG THỂ BẰNG API ===");
        
        // Cấu hình service P2P_TRANSFER qua DB để test (giả định gọi db)
        // Nhưng ta sẽ dùng Mongo trực tiếp hoặc API. 
        // Thay vì thế, để chắc chắn P2P hoạt động, service P2P_TRANSFER phải active.
        // Chạy đoạn script nhỏ để active P2P
        const { execSync } = require('child_process');
        execSync(`node -e "
            const sails = require('sails');
            sails.load({ environment: 'development' }, async (err) => {
                await Service.update({code: 'P2P_TRANSFER'}, {status: 'active'});
                sails.lower();
            });
        "`);
        console.log("-> Config P2P_TRANSFER active OK.");

        // Lấy 2 user để test (bằng script inline db)
        const output = execSync(`node -e "
            const sails = require('sails');
            sails.load({ environment: 'development' }, async (err) => {
                const userA = await Customer.findOne({ phone: '0901111111' });
                const userB = await Customer.findOne({ phone: '0902222222' });
                if(userA && userB) {
                    console.log(JSON.stringify({userA, userB}));
                } else {
                    console.log('MISSING');
                }
                sails.lower();
            });
        "`).toString();
        
        if (output.includes('MISSING')) {
            console.log("-> Thiếu user, kết thúc test.");
            return;
        }

        // Register if not exist
        await fetch('http://localhost:1337/auth/customer/register', {
            method: 'POST',
            headers: {'Content-Type': 'application/json'},
            body: JSON.stringify({ phone: '0905555555', pin: '111111', fullName: 'User A' })
        });
        await fetch('http://localhost:1337/auth/customer/register', {
            method: 'POST',
            headers: {'Content-Type': 'application/json'},
            body: JSON.stringify({ phone: '0906666666', pin: '111111', fullName: 'User B' })
        });

        const authA = await (await fetch('http://localhost:1337/auth/customer/login', {
            method: 'POST',
            headers: {'Content-Type': 'application/json'},
            body: JSON.stringify({ phone: '0905555555', pin: '111111' })
        })).json();
        
        if (authA.err !== 200) {
            console.log("-> Login thất bại:", authA);
            return;
        }
        
        const token = authA.data.token;
        console.log("-> Login User A OK.");

        // Lấy số dư hiện tại của A
        const balReq = await (await fetch('http://localhost:1337/pockets/me', {
            method: 'POST',
            headers: {'Content-Type': 'application/json', 'Authorization': 'Bearer ' + token},
        })).json();
        
        const initBalA = balReq.data.balance;
        console.log("-> Số dư đầu của A:", initBalA);

        console.log("\n4. Khởi tạo giao dịch (A chuyển B 50,000)...");
        const reqResult = await (await fetch('http://localhost:1337/transaction/request', {
            method: 'POST',
            headers: {'Content-Type': 'application/json', 'Authorization': 'Bearer ' + token},
            body: JSON.stringify({ 
                serviceCode: 'P2P_TRANSFER', 
                parameters: {
                    amount: 10000, 
                    receiverPhone: '0906666666',
                    description: 'Test P2P',
                    myField: 'test'
                }
            })
        })).json();

        if (reqResult.err !== 200) {
            console.log("-> Giao dịch bị từ chối:", reqResult);
            return;
        }

        const transRefId = reqResult.data.transRefId;
        console.log("-> Transaction Request OK! TransRefId:", transRefId);

        console.log("\n5. Confirm & Verify...");
        const confirmResult = await (await fetch('http://localhost:1337/transaction/confirm', {
            method: 'POST',
            headers: {'Content-Type': 'application/json', 'Authorization': 'Bearer ' + token},
            body: JSON.stringify({ transRefId })
        })).json();
        
        const verifyResult = await (await fetch('http://localhost:1337/transaction/verify', {
            method: 'POST',
            headers: {'Content-Type': 'application/json', 'Authorization': 'Bearer ' + token},
            body: JSON.stringify({ transRefId, pin: '111111' })
        })).json();

        console.log("-> Transaction Verify Result:", verifyResult.message);

        // Lấy lại số dư
        const balReqFinal = await (await fetch('http://localhost:1337/pockets/me', {
            method: 'POST',
            headers: {'Content-Type': 'application/json', 'Authorization': 'Bearer ' + token},
        })).json();
        const finalBalA = balReqFinal.data.balance;
        
        console.log("\n6. Kiểm tra lại số dư và lịch sử...");
        console.log("-> Số dư cuối của A:", finalBalA);
        
        const isADecreased = finalBalA < initBalA;
        console.log(`=> Test giảm tiền tài khoản chuyển: ${isADecreased ? 'PASS' : 'FAIL'}`);

        console.log("\n7. Lịch sử giao dịch (History)");
        const historyReq = await (await fetch('http://localhost:1337/transactions/me', {
            method: 'POST',
            headers: {'Content-Type': 'application/json', 'Authorization': 'Bearer ' + token},
            body: JSON.stringify({ limit: 1 })
        })).json();
        
        console.log(`=> Có lưu Biên lai Transaction: ${historyReq.data && historyReq.data.records && historyReq.data.records.length > 0 ? 'PASS' : 'FAIL'}`);
        if(historyReq.data && historyReq.data.records && historyReq.data.records.length > 0) {
             console.log(`   (Mã giao dịch: ${historyReq.data.records[0].transRefId})`);
        }
        
        console.log("\n=== HOÀN TẤT KIỂM THỬ ===");
        
    } catch (e) {
        console.error(e);
    }
}
runTest();
