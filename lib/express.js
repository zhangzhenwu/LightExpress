const Application = require('./application');
const Router = require('./Router')
function createApplication() {
    return new Application();
}

createApplication.Router = Router;
exports = module.exports = createApplication;