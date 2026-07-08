const sails = require('sails');

function startSails() {
    return new Promise((resolve, reject) => {
        sails.lift({
            hooks: { grunt: false, views: false, cors: false, csrf: false, i18n: false, pubsub: false },
            log: { level: 'warn' },
            port: 1338
        }, (err) => {
            if (err) return reject(err);
            resolve();
        });
    });
}

async function runTest() {
    console.log("=== BẮT ĐẦU KIỂM THỬ TẠO LUỒNG GIAO DỊCH ĐỘNG (LUCKY_MONEY) ===");
    try {
        await startSails();
        const baseUrl = 'http://localhost:1338';

        // 1. Login Admin
        console.log("\n1. Đăng nhập Admin...");
        const adminLogin = await (await fetch(baseUrl + '/auth/admin/login', {
            method: 'POST',
            headers: {'Content-Type': 'application/json'},
            body: JSON.stringify({ username: 'admin', password: '123456' })
        })).json();
        
        if(adminLogin.err !== 200) {
            throw new Error("Admin login failed");
        }
        const adminToken = adminLogin.data.token;
        console.log("-> Admin Token:", adminToken.substring(0, 20) + "...");

        // 2. Create New Service
        console.log("\n2. Admin tạo dịch vụ mới: Lì Xì (LUCKY_MONEY_5)...");
        const createSvc = await (await fetch(baseUrl + '/admin/services/create', {
            method: 'POST',
            headers: {'Content-Type': 'application/json', 'Authorization': 'Bearer ' + adminToken},
            body: JSON.stringify({
                code: 'LUCKY_MONEY_5',
                name: 'Lì Xì Phát Tài 5',
                description: 'Gửi tiền lì xì cho bạn bè',
                type: 'transfer'
            })
        })).json();
        
        // Nếu đã tồn tại, ta lấy lại danh sách để lấy ID
        let serviceId;
        if (createSvc.err === 200) {
            serviceId = createSvc.data.id;
        } else {
            const listSvc = await (await fetch(baseUrl + '/admin/services/list', {
                method: 'POST',
                headers: {'Content-Type': 'application/json', 'Authorization': 'Bearer ' + adminToken},
                body: JSON.stringify({})
            })).json();
            const found = listSvc.data.find(s => s.code === 'LUCKY_MONEY_5');
            if(!found) throw new Error("Could not create or find LUCKY_MONEY_5 service");
            serviceId = found.id;
        }
        console.log("-> Service ID:", serviceId);

        // 3. Save Configuration for LUCKY_MONEY_5
        console.log("\n3. Admin đẩy cấu hình động (No-Code Config) cho LUCKY_MONEY_5...");
        const configPayload = {
            serviceId: serviceId,
            action: 'transfer',
            authMethod: 'PIN',
            fee: { type: 'fixed', value: 888 }, // Phí lộc phát 888đ
            transFields: [
                { fieldName: 'RECEIVERPHONE', fieldFormat: 'string', isRequired: true, regex: '' },
                { fieldName: 'AMOUNT', fieldFormat: 'number', isRequired: true, regex: '' },
                { fieldName: 'MESSAGE', fieldFormat: 'string', isRequired: false, regex: '' }
            ],
            fieldBuilder: [
                { name: 'SENDERID', rule: 'mapping', source: 'ctx.senderId', order: 1 },
                { name: 'RECEIVERPHONE', rule: 'mapping', source: 'parameters.phone', order: 2 },
                { name: 'RECEIVERID', rule: 'query', source: 'queryPocketByPhone', order: 3 },
                { name: 'AMOUNT', rule: 'mapping', source: 'parameters.amount', order: 4 },
                { name: 'MESSAGE', rule: 'mapping', source: 'parameters.message', order: 5 }
            ],
            transValidations: [
                { valType: 'balance_check', errorCode: 'E01' }
            ],
            glSteps: [
                { amount: 'AMOUNT', debit: { level: 'productLevel', target: 'SENDERID' }, credit: { level: 'productLevel', target: 'RECEIVERID' }, order: 1 },
                { amount: 'FEE', debit: { level: 'productLevel', target: 'SENDERID' }, credit: { level: 'wallet', target: 'SYSTEM_FEE' }, order: 2 }
            ]
        };

        const saveCfg = await (await fetch(baseUrl + '/admin/services/config/save', {
            method: 'POST',
            headers: {'Content-Type': 'application/json', 'Authorization': 'Bearer ' + adminToken},
            body: JSON.stringify(configPayload)
        })).json();

        if (saveCfg.err !== 200) {
            console.error(saveCfg);
            throw new Error("Lỗi lưu cấu hình!");
        }
        
        // Active service
        await Service.update({ id: serviceId }, { status: 'active' });
        
        console.log("-> Config Saved & Service Activated OK!");

        // 4. Register/Login User A (người gửi) and B
        console.log("\n4. Đăng ký/Đăng nhập Customer A (0907777777) và B (0908888888)...");
        const regA = await (await fetch(baseUrl + '/auth/customer/register', {
            method: 'POST',
            headers: {'Content-Type': 'application/json'},
            body: JSON.stringify({ phone: '0907777777', pin: '111111', fullName: 'User C' })
        })).json();
        
        const regB = await (await fetch(baseUrl + '/auth/customer/register', {
            method: 'POST',
            headers: {'Content-Type': 'application/json'},
            body: JSON.stringify({ phone: '0908888888', pin: '111111', fullName: 'User D' })
        })).json();

        const loginRes = await (await fetch(baseUrl + '/auth/customer/login', {
            method: 'POST',
            headers: {'Content-Type': 'application/json'},
            body: JSON.stringify({ phone: '0907777777', pin: '111111' })
        })).json();
        
        if (loginRes.err !== 200) throw new Error("Customer A login failed");
        const userAToken = loginRes.data.token;
        const userA = await Customer.findOne({ phone: '0907777777' });

        const loginResB = await (await fetch(baseUrl + '/auth/customer/login', {
            method: 'POST',
            headers: {'Content-Type': 'application/json'},
            body: JSON.stringify({ phone: '0908888888', pin: '111111' })
        })).json();
        if (loginResB.err !== 200) throw new Error("Customer B login failed: " + JSON.stringify(loginResB));
        const userB = await Customer.findOne({ phone: '0908888888' });

        // Bơm tiền cho User A (để có tiền lì xì)
        await fetch(baseUrl + '/admin/pockets/topup', {
            method: 'POST',
            headers: {'Content-Type': 'application/json', 'Authorization': 'Bearer ' + adminToken},
            body: JSON.stringify({ pocketId: userA.pocket, amount: 50000 })
        });

        const pocketA = await Pocket.findOne({ id: userA.pocket });
        const pocketB = await Pocket.findOne({ id: userB.pocket });
        
        console.log(`-> Số dư đầu A: ${pocketA.balance}`);
        console.log(`-> Số dư đầu B: ${pocketB.balance}`);

        // 5. Thực hiện giao dịch Lì xì
        const amount = 8888;
        const fee = 888;
        console.log(`\n5. Khởi tạo giao dịch Lì xì (A gửi B số tiền ${amount}, phí ${fee})...`);
        const reqTrans = await (await fetch(baseUrl + '/transaction/request', {
            method: 'POST',
            headers: {'Content-Type': 'application/json', 'Authorization': 'Bearer ' + userAToken},
            body: JSON.stringify({
                serviceCode: 'LUCKY_MONEY_5',
                parameters: { phone: '0908888888', amount: amount, message: 'Năm mới phát tài!' }
            })
        })).json();

        if (reqTrans.err !== 200) throw new Error(reqTrans.message);
        const transRefId = reqTrans.data.transRefId;
        console.log("-> Request OK! TransRefId:", transRefId);

        console.log("-> Confirm...");
        const confTrans = await (await fetch(baseUrl + '/transaction/confirm', {
            method: 'POST',
            headers: {'Content-Type': 'application/json', 'Authorization': 'Bearer ' + userAToken},
            body: JSON.stringify({ transRefId })
        })).json();

        console.log("-> Verify với mã PIN...");
        const verTrans = await (await fetch(baseUrl + '/transaction/verify', {
            method: 'POST',
            headers: {'Content-Type': 'application/json', 'Authorization': 'Bearer ' + userAToken},
            body: JSON.stringify({ transRefId, pin: '111111' })
        })).json();

        if (verTrans.err !== 200) {
            console.error("Lỗi Verify:", verTrans);
            throw new Error(verTrans.message);
        } else {
            console.log("-> Giao dịch thành công. Mã GD:", verTrans.data.transactionCode);
        }

        // 6. Kiểm tra lại số dư
        console.log("\n6. Kiểm tra lại số dư hệ thống...");
        const pocketA_after = await Pocket.findOne({ id: userA.pocket });
        const pocketB_after = await Pocket.findOne({ id: userB.pocket });

        console.log(`-> Số dư A sau GD: ${pocketA_after.balance} (Giảm ${pocketA.balance - pocketA_after.balance} đ)`);
        console.log(`-> Số dư B sau GD: ${pocketB_after.balance} (Tăng ${pocketB_after.balance - pocketB.balance} đ)`);
        
        if (pocketA.balance - pocketA_after.balance === (amount + fee) && 
            pocketB_after.balance - pocketB.balance === amount) {
            console.log("=> TIỀN KHỚP HOÀN TOÀN TRÊN SỔ CÁI! THIẾT KẾ NO-CODE HOẠT ĐỘNG HOÀN HẢO! PASS!");
        } else {
            console.error("=> LỖI: SỐ DƯ KHÔNG KHỚP!");
        }

    } catch (e) {
        console.error(e);
    } finally {
        if (sails) sails.lower(() => {
            console.log("\n=== HOÀN TẤT KIỂM THỬ ===");
            process.exit(0);
        });
    }
}

runTest();
