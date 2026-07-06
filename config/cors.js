module.exports.cors = {
  allRoutes: true,
  origin: 'http://localhost:5173',
  credentials: true,
  methods: 'GET, POST, PUT, DELETE, OPTIONS, HEAD',
  headers: 'content-type, authorization, x-csrf-token'
};
