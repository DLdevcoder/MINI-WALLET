const ChecksumService = require('./ChecksumService');

// Mutex để chống xung đột OCC (Hot Document) tại Node.js level
const pocketMutexes = {};

async function acquireLock(pocketId) {
    if (!pocketMutexes[pocketId]) {
        pocketMutexes[pocketId] = Promise.resolve();
    }
    let release;
    const lockPromise = new Promise(resolve => { release = resolve; });
    const previous = pocketMutexes[pocketId];
    pocketMutexes[pocketId] = pocketMutexes[pocketId].then(() => lockPromise);
    await previous;
    return release;
}

module.exports = {
    /**
     * Khoá ví (đánh dấu inProgress) để tránh race condition ở logic khác
     */
    lockPocket: function (pocketId) {
        return new Promise((resolve, reject) => {
            Pocket.native(function (err, collection) {
                if (err) return reject(err);

                let query;
                try {
                    const mongodb = require('mongodb');
                    const ObjectId = mongodb.ObjectID || mongodb.ObjectId;
                    query = { _id: new ObjectId(pocketId), status: 'active' };
                } catch (e) {
                    query = { _id: pocketId, status: 'active' };
                }

                collection.updateOne(
                    query,
                    { $set: { status: 'inProgress' } },
                    function (err2, result) {
                        if (err2) return reject(err2);
                        const matched = result.matchedCount !== undefined ? result.matchedCount : result.result.n;
                        resolve(matched === 1);
                    }
                );
            });
        });
    },

    /**
     * Mở khoá ví
     */
    unlockPocket: function (pocketId) {
        return Pocket.update({ id: pocketId }, { status: 'active' }).catch(() => { });
    },

    /**
     * Giải quyết Pocket ID từ level + target (Dành riêng cho Engine TransDefinition)
     */
    resolvePocketId: async function (level, target, transBody) {
        if (level === 'wallet') {
            const realTarget = transBody[target] !== undefined ? transBody[target] : target;
            const pocket = await Pocket.findOne({ user: realTarget });
            return pocket ? pocket.id : null;
        }
        return transBody[target] || null;
    },

    /**
     * Cập nhật số dư và checksum (Bảo vệ bằng In-Memory Mutex + OCC)
     */
    updatePocketBalance: async function (pocketId, amountChange, maxRetries = 10) {
        // Tuần tự hoá các request truy cập vào cùng 1 ví (Giữ an toàn tuyệt đối cho Hot Document)
        const releaseMutex = await acquireLock(pocketId);
        
        try {
            let retries = 0;
            
            let objectId;
            try {
                const mongodb = require('mongodb');
                const ObjectId = mongodb.ObjectID || mongodb.ObjectId;
                objectId = new ObjectId(pocketId);
            } catch (e) {
                objectId = pocketId;
            }

            while (retries < maxRetries) {
                // 1. Đọc state hiện tại
                const pocket = await Pocket.findOne({ id: pocketId });
                if (!pocket) {
                    throw new Error('Pocket not found: ' + pocketId);
                }

                const oldBalance = pocket.balance || 0;
                const oldChecksum = pocket.checksum;
                
                // 2. Tính toán state mới
                const newBalance = oldBalance + amountChange;
                const newChecksum = ChecksumService.compute(newBalance, pocket.user);

                // 3. Thực hiện update atomic với OCC
                const modifiedCount = await new Promise((resolve, reject) => {
                    Pocket.native(function (err, collection) {
                        if (err) return reject(err);

                        collection.updateOne(
                            { _id: objectId, checksum: oldChecksum },
                            { $set: { balance: newBalance, checksum: newChecksum } },
                            function (err2, result) {
                                if (err2) return reject(err2);
                                const matched = result.modifiedCount !== undefined ? result.modifiedCount : (result.result ? result.result.nModified : 0);
                                resolve(matched);
                            }
                        );
                    });
                });

                if (modifiedCount === 1) {
                    return { newBalance, newChecksum };
                }

                // Có sự thay đổi xen ngang, thử lại
                retries++;
                if (retries < maxRetries) {
                    await new Promise(r => setTimeout(r, 10 + Math.random() * 40));
                }
            }

            throw new Error('Cập nhật số dư ví thất bại do hệ thống quá tải (Concurrency Conflict). Vui lòng thử lại sau.');
        } finally {
            // Mở khoá Mutex cho request tiếp theo
            releaseMutex();
        }
    }
};
