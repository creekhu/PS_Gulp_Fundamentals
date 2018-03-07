module.exports = function() {
    var client = './src/client/';
    var clientApp = client + 'app/';
    var temp = './.tmp/';
    var server = './src/server';

    var config = {

        /* File path */
        alljs: [
            './src/**/*.js',
            './*.js'
        ],
        index: client + 'index.html',
        js: [
            clientApp + '**/*.module.js',
            clientApp + '**/*.js',
            '!' + '**/*.spec.js',
        ],
        less: client + 'styles/styles.less',
        server: server,
        client: client,
        temp: temp,
        css: temp + 'styles.css',
        htmltemplates: clientApp + '**/*.html',
        build: './build/',
        fonts: './bower_components/font-awesome/fonts/**/*.*',
        images: client + 'images/**/*.*',

        /**
         * tempate cache
         */
        templateCache: {
            file: 'templates.js',
            options: {
                module: 'app.core',
                standAlone: false,
                root: 'app/'
            }
        },

        /* Bower and NPM locations */
        bower: {
            json: require('./bower.json'),
            directory: './bower_components',
            ignorePath: '../..'
        },

        /**
         * Node settings
        */

        defaultPort: 7203,
        nodeServer: './src/server/app.js',

        /**
         * browser sync
         */

         browserReloadDelay: 1000,

    };

    config.getWiredepDefaultOptions = function() {
        var options = {
            bowerJson: config.bower.json,
            directory: config.bower.directory,
            ignorePath: config.bower.ignorePath
        };

        return options;
    };

    return config;
};
