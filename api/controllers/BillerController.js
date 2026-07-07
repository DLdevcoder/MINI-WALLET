module.exports = {
  listBillers: async function (req, res) {
    try {
      const page = parseInt(req.body.page) || 1;
      const limit = parseInt(req.body.limit) || 10;
      const skip = (page - 1) * limit;

      const billers = await Biller.find().populate('pocket').sort('createdAt DESC').skip(skip).limit(limit);
      const total = await Biller.count();

      return res.ok({
        page, limit, total,
        records: billers
      });
    } catch (err) {
      console.error('listBillers Error:', err);
      return res.serverError(err);
    }
  },

  createBiller: async function (req, res) {
    try {
      const { billerCode, name, inquiryUrl, paymentUrl } = req.body;
      if (!billerCode || !name) return res.badRequest({ message: 'Thiếu mã hoặc tên đối tác' });

      const ChecksumService = require('../services/ChecksumService');
      const hash = ChecksumService.compute(0, billerCode);

      // Create pocket for biller
      const pocket = await Pocket.create({
        user: billerCode,
        client: 'biller',
        balance: 0,
        currency: 'VND',
        status: 'active',
        checksum: hash
      });

      const newBiller = await Biller.create({
        billerCode,
        name,
        inquiryUrl,
        paymentUrl,
        pocket: pocket.id,
        status: 'active'
      });

      return res.ok(newBiller);
    } catch (err) {
      if (err.code === 'E_UNIQUE') {
         return res.badRequest({ message: 'Mã đối tác (BillerCode) đã tồn tại!' });
      }
      return res.serverError(err);
    }
  },

  updateBiller: async function (req, res) {
    try {
      const { id, name, inquiryUrl, paymentUrl, status } = req.body;
      if (!id) return res.badRequest({ message: 'Thiếu ID' });

      const updateData = {};
      if (name) updateData.name = name;
      if (inquiryUrl !== undefined) updateData.inquiryUrl = inquiryUrl;
      if (paymentUrl !== undefined) updateData.paymentUrl = paymentUrl;
      if (status) updateData.status = status;

      const updated = await Biller.update({ id }, updateData);
      if (!updated || updated.length === 0) return res.badRequest({ message: 'Không tìm thấy đối tác' });
      
      return res.ok(updated[0]);
    } catch (err) {
      return res.serverError(err);
    }
  }
};
