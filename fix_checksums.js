const MongoClient = require('mongodb').MongoClient;
const crypto = require('crypto');

async function fix() {
    const url = 'mongodb://localhost:27017/mini_wallet?replicaSet=rs0';
    MongoClient.connect(url, async function(err, db) {
        if (err) throw err;
        try {
            const collection = db.collection('pocket');
            const pockets = await collection.find({}).toArray();
            for (const p of pockets) {
                const checksum = crypto.createHash('sha256').update(`${p.balance}|${p.user}`).digest('hex');
                if (p.checksum !== checksum && p.checksum !== 'init_hash' && !p.checksum.startsWith('hash_init_')) {
                    console.log(`Fixing checksum for pocket ${p.user}`);
                    await collection.updateOne({ _id: p._id }, { $set: { checksum: checksum } });
                }
            }
            console.log('All done!');
        } catch (e) {
            console.error(e);
        } finally {
            db.close();
        }
    });
}
fix();
