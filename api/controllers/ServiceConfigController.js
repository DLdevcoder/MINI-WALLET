module.exports = {
  listServices: async function (req, res) {
    try {
      const services = await Service.find().sort('createdAt ASC');
      return res.ok(services);
    } catch (err) {
      return res.serverError(err);
    }
  },

  createService: async function (req, res) {
    try {
      const { code, name, authMethod } = req.body;
      if (!code || !name) return res.badRequest({ message: 'Thiếu mã hoặc tên dịch vụ' });

      // Create service
      const newService = await Service.create({
        code: code,
        name: name,
        auth: { method: authMethod || 'NONE' },
        status: 'inactive' // Tạm tắt đến khi cấu hình xong
      });

      return res.ok(newService);
    } catch (err) {
      if (err.code === 'E_UNIQUE') {
         return res.badRequest({ message: 'Mã dịch vụ (Code) đã tồn tại!' });
      }
      return res.serverError(err);
    }
  },

  toggleServiceStatus: async function (req, res) {
    try {
      const serviceId = req.param('serviceId');
      if (!serviceId) return res.badRequest({ message: 'Thiếu serviceId' });
      
      const service = await Service.findOne({ id: serviceId });
      if (!service) return res.badRequest({ message: 'Không tìm thấy service' });

      const newStatus = service.status === 'active' ? 'inactive' : 'active';
      const updated = await Service.update({ id: serviceId }, { status: newStatus });
      return res.ok(updated[0]);
    } catch (err) {
      return res.serverError(err);
    }
  },

  updateService: async function (req, res) {
    try {
      const { serviceId, code, name, authMethod } = req.body;
      if (!serviceId) return res.badRequest({ message: 'Thiếu serviceId' });
      
      const updateData = {};
      if (code) updateData.code = code;
      if (name) updateData.name = name;
      if (authMethod) updateData.auth = { method: authMethod };

      const updated = await Service.update({ id: serviceId }, updateData);
      if (!updated || updated.length === 0) return res.badRequest({ message: 'Không tìm thấy service' });
      
      return res.ok(updated[0]);
    } catch (err) {
      if (err.code === 'E_UNIQUE') {
         return res.badRequest({ message: 'Mã dịch vụ (Code) đã tồn tại!' });
      }
      return res.serverError(err);
    }
  },

  getServiceConfig: async function (req, res) {
    try {
      const serviceId = req.param('serviceId');
      if (!serviceId) return res.badRequest({ message: 'Missing serviceId' });

      const service = await Service.findOne({ id: serviceId });
      if (!service) return res.badRequest({ message: 'Service not found' });

      const transFields = await TransField.find({ service: serviceId }).sort('order ASC');
      const transValidations = await TransValidation.find({ service: serviceId }).sort('order ASC');
      const transDefinition = await TransDefinition.findOne({ service: serviceId });

      return res.ok({
        service: service,
        transFields: transFields,
        transValidations: transValidations,
        transDefinition: transDefinition
      });
    } catch (err) {
      return res.serverError(err);
    }
  },

  saveServiceConfig: async function (req, res) {
    try {
      const serviceId = req.param('serviceId');
      const payload = req.body;

      if (!serviceId) return res.badRequest({ message: 'Missing serviceId' });
      const service = await Service.findOne({ id: serviceId });
      if (!service) return res.badRequest({ message: 'Service not found' });

      // Cập nhật bảng Service (Fee, FieldBuilder)
      if (payload.fee !== undefined) service.fee = payload.fee;
      if (payload.fieldBuilder !== undefined) service.fieldBuilder = payload.fieldBuilder;
      await Service.update({ id: serviceId }, { fee: service.fee, fieldBuilder: service.fieldBuilder });

      // Cập nhật TransField
      if (payload.transFields && Array.isArray(payload.transFields)) {
        await TransField.destroy({ service: serviceId }); // Xoá cũ
        for (let i = 0; i < payload.transFields.length; i++) {
          const tf = payload.transFields[i];
          await TransField.create({
            service: serviceId,
            fieldName: tf.fieldName,
            fieldFormat: tf.fieldFormat || 'string',
            minLength: tf.minLength,
            maxLength: tf.maxLength,
            regex: tf.regex,
            isRequired: tf.isRequired || false,
            order: i + 1,
            status: 'active'
          });
        }
      }

      // Cập nhật TransValidation
      if (payload.transValidations && Array.isArray(payload.transValidations)) {
        await TransValidation.destroy({ service: serviceId });
        for (let i = 0; i < payload.transValidations.length; i++) {
          const tv = payload.transValidations[i];
          await TransValidation.create({
            service: serviceId,
            valCondition: tv.valCondition,
            valType: tv.valType || 'balance_check',
            errorCode: tv.errorCode || 'E00',
            order: i + 1,
            status: 'active'
          });
        }
      }

      // Cập nhật TransDefinition (glSteps)
      if (payload.glSteps && Array.isArray(payload.glSteps)) {
        const exist = await TransDefinition.findOne({ service: serviceId });
        if (exist) {
          await TransDefinition.update({ service: serviceId }, { glSteps: payload.glSteps });
        } else {
          await TransDefinition.create({ service: serviceId, glSteps: payload.glSteps });
        }
      }

      return res.ok({ message: 'Lưu cấu hình thành công' });
    } catch (err) {
      console.error(err);
      return res.serverError(err);
    }
  }
};
