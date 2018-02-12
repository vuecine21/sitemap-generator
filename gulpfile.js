var paths = require('./gulp.config.json');
var gulp = require('gulp');
var del = require('del');
var fs = require('fs');
var semver = require('semver');
var $ = require('gulp-load-plugins')();

// GULP PARAMETERS
var argv = require('yargs').argv;
var isProd = (argv.prod !== undefined);
var isBump = (argv.bump !== undefined);
var bumpStep = argv.bump || 'patch';

/** ============================
 *  MAIN TASKS
 *  ============================*/

gulp.task('build', [
    'clean',
    'copy-manifest',
    'copy-images',
    'copy-locales',
    'build-html',
    'build-js',
    'gen-docs'
]);

gulp.task('default',
    ['build', 'jshint', 'watch']);

gulp.task('release', function () {
    var version = JSON.parse(fs.readFileSync(paths.manifest, 'utf8')).version_name;
    return gulp.src(paths.dist + '/**/*')
        .pipe($.zip('release.' + version + '.zip'))
        .pipe(gulp.dest(paths.publish));
});

/** ============================
 *  INIDIVIDUAL TASKS
 *  ============================ */

gulp.task('jshint', function () {
    return gulp.src(paths.js)
        .pipe($.jshint())
        .pipe($.jshint.reporter('jshint-stylish'));
});

gulp.task('watch', function () {
    gulp.watch(paths.html, ['build-html']);
    gulp.watch(paths.js, ['jshint', 'build-js', 'gen-docs']);
    gulp.watch(paths.locales + '**/*.json', ['copy-locales']);
    gulp.watch(paths.manifest, ['copy-manifest']);
    gulp.watch(paths.icons, ['copy-images']);
});

gulp.task('clean', function () {
    return del.sync(paths.dist + '/*');
});

gulp.task('copy-manifest', function () {
    var manifest = JSON.parse(fs.readFileSync(paths.manifest, 'utf8'));
    var app_name = JSON.parse(fs.readFileSync(paths.locales + "/en/messages.json", 'utf8')).appName.message;
    var version_name = (isBump) ? semver.inc(manifest.version_name, bumpStep || 'patch') : manifest.version_name;

    // keep package.json in sync with proj+manifest changes
    gulp.src(paths.package)
        .pipe($.jsonModify({
            key: 'version',
            value: version_name
        })).pipe($.jsonModify({
            key: 'name',
            value: app_name.toLowerCase().replace(/ /g, "-").replace(/[^-a-z0-9]+/g, "")
        }))
        .pipe(gulp.dest('./'));

    // on bump update manifest
    if (isBump) {
        return gulp.src(paths.manifest)
            .pipe($.jsonModify({
                key: 'version',
                value: semver.inc(manifest.version, bumpStep || 'patch')
            }))
            .pipe($.jsonModify({
                key: 'version_name',
                value: version_name
            }))
            .pipe(gulp.dest('./'))
            .pipe(gulp.dest(paths.dist))
    } else {
        return gulp.src(paths.manifest)
            .pipe(gulp.dest(paths.dist));
    }
});

gulp.task('copy-images', function () {
    return gulp.src(paths.icons)
        .pipe(gulp.dest(paths.dist + "/icons"));
});

gulp.task('build-html', function () {
    return gulp.src(paths.html)
        .pipe($.if(isProd, $.stripComments()))
        .pipe($.htmlmin({collapseWhitespace: true}))
        .pipe($.rename(function (path) {
            path.dirname = "";
        }))
        .pipe(gulp.dest(paths.dist));
});

gulp.task('copy-locales', function () {
    paths.locales_list.map(function (language) {
        if (fs.existsSync(paths.locales + language)) {
            gulp.src(paths.locales + language + "/**/*.json")
                .pipe($.mergeJson({ fileName: 'messages.json' }))
                .pipe(gulp.dest(paths.dist + "/_locales/" + language));
        } else {
            gulp.src(paths.locales + "/en/**/*.json")
                .pipe($.mergeJson({ fileName: 'messages.json' }))
                .pipe(gulp.dest(paths.dist + "/_locales/" + language));
        }
    });
});

gulp.task('build-js', function () {
    gulp.src(paths.modules)
        .pipe($.if(isProd, $.stripDebug()))
        .pipe($.if(isProd, $.stripComments()))
        .pipe($.if(isProd, $.uglify()))
        .pipe(gulp.dest(paths.dist));
    gulp.src(paths.content)
        .pipe($.concat('content.js'))
        .pipe($.if(isProd, $.stripDebug()))
        .pipe($.if(isProd, $.stripComments()))
        .pipe($.if(isProd, $.uglify()))
        .pipe(gulp.dest(paths.dist));
    return gulp.src(paths.background)
        .pipe($.concat('background.js'))
        .pipe($.if(isProd, $.stripDebug()))
        .pipe($.if(isProd, $.stripComments()))
        .pipe($.if(isProd, $.uglify()))
        .pipe(gulp.dest(paths.dist));
});

gulp.task('gen-docs', function () {
    var command = "documentation build src/** -f md -o docs/docs.md -c docs/.docs.yml";
    var exec = require('child_process').exec;
    exec(command, function (err, stdout, stderr) {
    });
});