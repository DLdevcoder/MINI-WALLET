async function runTest() {
    try {
        console.log("=== BẮT ĐẦU KIỂM THỬ BATCH PAYOUT ===");

        // Kích hoạt qua Mongo
        const { MongoClient } = require('mongodb');
        const client = await MongoClient.connect('mongodb://localhost:27017');
        const db = client.db('mini_wallet');
        await db.collection('service').updateOne({ code: 'BATCH_PAYOUT' }, { $set: { status: 'active' } });
        console.log('Active service BATCH_PAYOUT OK');

        // 2. Register merchant and users
        console.log("-> Đăng ký User (Merchant & Users)...");
        await (await fetch('http://127.0.0.1:1337/auth/customer/register', {
            method: 'POST',
            headers: {'Content-Type': 'application/json'},
            body: JSON.stringify({ phone: '0901234567', pin: '111111', fullName: 'Merchant' })
        })).text();
        await (await fetch('http://127.0.0.1:1337/auth/customer/register', {
            method: 'POST',
            headers: {'Content-Type': 'application/json'},
            body: JSON.stringify({ phone: '0908888888', pin: '111111', fullName: 'User 1' })
        })).text();
        await (await fetch('http://127.0.0.1:1337/auth/customer/register', {
            method: 'POST',
            headers: {'Content-Type': 'application/json'},
            body: JSON.stringify({ phone: '0909999999', pin: '111111', fullName: 'User 2' })
        })).text();

        // 3. Login merchant
        const auth = await (await fetch('http://127.0.0.1:1337/auth/customer/login', {
            method: 'POST',
            headers: {'Content-Type': 'application/json'},
            body: JSON.stringify({ phone: '0901234567', pin: '111111' })
        })).json();
        
        if (auth.err !== 200) {
            console.log("-> Login thất bại:", auth);
            return;
        }
        const token = auth.data.token;
        console.log("-> Login Merchant OK.");

        // 4. Bơm tiền cho merchant 
        const merchantPhone = '0901234567';
        const merchantCustomer = await db.collection('customer').findOne({ phone: merchantPhone });
        if (merchantCustomer) {
            await db.collection('pocket').updateOne({ _id: merchantCustomer.pocket }, { $set: { balance: 1000000 } });
            console.log('Bơm 1,000,000 VND cho Merchant OK');
        }
        await client.close();

        // 5. Check số dư hiện tại của Merchant
        const balReq = await (await fetch('http://127.0.0.1:1337/pockets/me', {
            method: 'POST',
            headers: {'Content-Type': 'application/json', 'Authorization': 'Bearer ' + token},
        })).json();
        console.log("-> Số dư Merchant:", balReq.data.balance);

        // 6. Gọi BATCH PAYOUT
        console.log("\n-> Thực hiện BATCH PAYOUT (Chuyển 50k cho User 1, 30k cho User 2)...");
        const batchReq = await (await fetch('http://127.0.0.1:1337/transaction/batch-payout', {
            method: 'POST',
            headers: {'Content-Type': 'application/json', 'Authorization': 'Bearer ' + token},
            body: JSON.stringify({ 
                serviceCode: 'BATCH_PAYOUT', 
                pin: '111111',
                transactions: [
                    { receiverPhone: '0908888888', amount: 50000 },
                    { receiverPhone: '0909999999', amount: 30000 }
                ]
            })
        })).json();

        console.log("-> BATCH PAYOUT Result:", JSON.stringify(batchReq, null, 2));

        if (batchReq.err === 200) {
            // Check lại số dư Merchant
            const balAfter = await (await fetch('http://127.0.0.1:1337/pockets/me', {
                method: 'POST',
                headers: {'Content-Type': 'application/json', 'Authorization': 'Bearer ' + token},
            })).json();
            console.log("-> Số dư Merchant sau BATCH:", balAfter.data.balance);
            console.log("OK - Hoạt động trơn tru!");
        } else {
            console.log("Lỗi BATCH PAYOUT.");
        }

    } catch (e) {
        console.error(e);
    }
}

runTest();
