const sails = require('sails');
sails.load({ environment: 'development' }, async (err) => {
    if (err) return console.error(err);
    try {
        const PocketService = require('./api/services/PocketService');
        const ChecksumService = require('./api/services/ChecksumService');
        
        const pocket = await Pocket.find().limit(1);
        if(!pocket || pocket.length === 0) throw new Error("No pocket found to test");
        const pId = pocket[0].id;
        
        console.log("Initial balance:", pocket[0].balance);
        
        const promises = [];
        for(let i=0; i<10; i++) {
            promises.push(PocketService.updatePocketBalance(pId, 10));
        }
        
        await Promise.all(promises);
        
        const finalPocket = await Pocket.findOne({id: pId});
        console.log("Final balance:", finalPocket.balance);
        console.log("Expected balance:", pocket[0].balance + 100);
        console.log("Checksum valid?", ChecksumService.verify(finalPocket));
        
    } catch(e) {
        console.error("LỖI:", e);
    } finally {
        sails.lower();
    }
});
