var gulp = require('gulp');
// usage: gulp task --args
var args = require('yargs').argv;

// get all gulp plugins at once
var $ = require('gulp-load-plugins')({ lazy: true });
var print = require('gulp-print').default;
var nodemon = require('gulp-nodemon');
var del = require('del');
var wiredep = require('wiredep').stream;
var browserSync = require('browser-sync');
var useref = require('gulp-useref');
var filter = require('gulp-filter');

var config = require('./gulp.config')();
var port = process.env.PORT || config.defaultPort;

/* gulp vet --verbose to print all targeting files */

gulp.task('vet', function() {
    log('Analyzing source with JSHint and JSCS');
    return gulp
        .src(config.alljs)
        .pipe($.if(args.verbose, print()))
        .pipe($.jscs())
        .pipe($.jshint())
        .pipe($.jshint.reporter('jshint-stylish', { verbose: true }))
        .pipe($.jshint.reporter('fail'));
});

gulp.task('styles', ['clean-styles'], function() {
    log('Compiling Less to CSS');

    return gulp
        .src(config.less)
        .pipe($.plumber())
        .pipe($.less())
        .pipe($.autoprefixer({ browsers: ['last 2 version', '> 5%']}))
        .pipe(gulp.dest(config.temp));
});

gulp.task('less-watcher', function() {
    gulp.watch([config.less], ['styles']);
});

gulp.task('wiredep', function() {
    log('Wire up the bower css js and our app into the html');
    var options = config.getWiredepDefaultOptions();

    return gulp
        .src(config.index)
        .pipe(wiredep(options))
        .pipe($.inject(gulp.src(config.js)))
        .pipe(gulp.dest(config.client));
});

// for injecting custom css
gulp.task('inject', ['wiredep', 'styles', 'templatecache'], function() {
        log('Injecting custom css');

        return gulp
            .src(config.index)
            .pipe($.inject(gulp.src(config.css)))
            .pipe(gulp.dest(config.client));
});

gulp.task('optimize', ['inject', 'fonts', 'images'], function() {
    log('Optimizing js, html, and css');

    var templateCache = config.temp + config.templateCache.file;
    var cssFilter = filter(['**/*.css'], { restore: true });
    var jsFilter = filter(['**/*.js'], { restore: true });

    return gulp
        .src(config.index)
        .pipe($.plumber())
        .pipe($.inject(gulp.src(templateCache, { read: false }, { starttag: '<!-- inject:templates:js -->' })))
        .pipe(useref({ searchPath: './' }))
        .pipe(cssFilter)
        .pipe($.csso())
        .pipe(cssFilter.restore)
        .pipe(jsFilter)
        .pipe($.uglify())
        .pipe(jsFilter.restore)
        .pipe(gulp.dest(config.build));
});

gulp.task('task-list', $.taskListing);

gulp.task('fonts', ['clean-fonts'], function() {
    log('Copying fonts');

    return gulp
        .src(config.fonts)
        .pipe(gulp.dest(config.build + 'fonts'));
});

gulp.task('images', ['clean-images'], function() {
    log('Copying and compressing images');

    return gulp
        .src(config.images)
        .pipe($.imagemin({ optimizationLevel: 4 }))
        .pipe(gulp.dest(config.build + 'images'));
});

/**
 * Use template cache to reduce the number of HTTP requests
 */

gulp.task('templatecache', ['clean-code'], function() {
    log('Creating AngularJS $templateCache');

    return gulp
        .src(config.htmltemplates)
        .pipe($.minifyHtml({ empty: true }))
        .pipe($.angularTemplatecache(
            config.templateCache.file,
            config.templateCache.options
        ))
        .pipe(gulp.dest(config.temp));
});

/* Clean tasks */

gulp.task('clean', function() {
    var delconfig = [].concat(config.build, config.temp);
    log('Cleaning: ' + $.util.colors.blue(delconfig));
    del(delconfig);
});

gulp.task('clean-styles', function() {
    var path = config.temp + '**/*.css';
    clean(path);
});

gulp.task('clean-fonts', function() {
    var path = config.build + 'fonts/**/*.*';
    clean(path);
});

gulp.task('clean-images', function() {
    var path = config.temp + 'images/**/*.css';
    clean(path);
});

gulp.task('clean-code', function() {
    var files = [].concat(
        config.temp + '**/*.js',
        config.build + '**/*.html',
        config.build + 'js/**/*.js'
    );

    clean(files);
});

/* Server tasks */

gulp.task('serve-dev', function() {
    serve(true)
});

gulp.task('serve-build', function() {
    serve(false);
});

/* Helper functions */

function serve(isDev) {

    var nodeOptions = {
        script: config.nodeServer,
        delayTime: 1,
        env: {
            'PORT': port,
            'NODE_ENV': isDev ? 'dev' : 'build'
        },
        watch: [config.server]
    };

    return $.nodemon(nodeOptions)
        .on('restart', ['vet'], function(event) {
            log('*** nodemon restarted');
            log('files changed on restarted:\n' + event);
            setTimeout(function () {
                browserSync.notify('reloading now ...');
                browserSync.reload({ stream: false });
            }, config.browserReloadDelay);
        })
        .on('start', function() {
            log('*** nodemon started');
            startBrowserSync(isDev);
        })
        .on('crash', function() {
            log('*** nodemon crashed: script crashed for some reason');
        })
        .on('exit', function() {
            log('*** nodemon exited cleanly');
        });
}

function changeEvent(event) {
    var srcPattern = new RegExp('/.*(?=/' + config.source + ')/');
    log('File ' + event.path.replace(srcPattern, '') + ' ' + event.type);
}

function startBrowserSync(isDev) {
    if (browserSync.active) {
        return;
    }

    log('Starting browser-sync on port' + port);

    if (isDev) {
        gulp.watch([config.less], ['styles'])
            .on('change', function(event) {
                changeEvent(event);
            });
    } else {
        gulp.watch([config.less, config.js, config.html], ['optimize', browserSync.reload])
            .on('change', function(event) {
                changeEvent(event);
            });
    }

    var options = {
        proxy: 'localhost:' + port,
        port: 3000,
        files: isDev ? [
            config.client + '**/*.*',
            '!' + config.less,
            config.temp + '**/*.css'
        ] : [],
        ghostMode: {
            clicks: true,
            location: false,
            forms: true,
            scroll: true
        },
        injectChanges: true,
        logFileChanges: true,
        logLevel: 'debug',
        logPrefix: 'gulp-patterns',
        notify: true,
        reloadDeplay: 0,
    };

    browserSync(options);
}

function clean(path) {
    log('Cleaning' + $.util.colors.blue(path));
    del(path).then(function(path) {
        console.log('Deleted path is' + path);
    });
}

function log(msg) {
    if (typeof(msg) === 'object') {
        for (var item in msg) {
            if (msg.hasOwnProperty(item)) {
                $.util.log($.util.colors.blue(msg[item]));
            }
        }
    } else {
        $.util.log($.util.colors.blue(msg));
    }
}
