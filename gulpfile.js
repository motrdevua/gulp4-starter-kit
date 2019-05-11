"use strict";

const {
    src,
    dest,
    watch,
    series,
    parallel,
} = require('gulp');
const plugin = require('gulp-load-plugins')({
    rename: {
        'gulp-clean-css': 'cleanCSS',
        'gulp-svg-sprite': 'spriteSVG'
    }
});
const imageminJR = require('imagemin-jpeg-recompress');
const pngquant = require('imagemin-pngquant');
const merge2 = require('merge2');
const del = require('del');
const browserSync = require("browser-sync").create();
const reload = browserSync.reload;

const onError = err => {
    plugin.notify.onError({
        title: `Error in ${err.plugin}`,
        message: '<%= error.message %>',
        sound: 'Pop',
        onLast: true
    })(err);
    this.emit('end');
};

const path = {
    src: {
        html: 'src/*.{htm,html,php}',
        sass: 'src/assets/sass/',
        js: 'src/assets/js/',
        img: 'src/assets/img/',
        fonts: 'src/assets/fonts/'
    },
    dist: 'dist/'
};

/* ===================   serve  =================== */

function serve() {
    browserSync.init({
        server: path.dist
    });
}

/* ====================  html  ==================== */

function html() {
    return src(path.src.html)
        .pipe(plugin.include())
        .pipe(dest(path.dist))
}

/* ===================  styles  =================== */

function styles() {
    return src(`${path.src.sass}*.sass`)
        .pipe(plugin.plumber({
            errorHandler: onError
        }))
        .pipe(plugin.sass({
            outputStyle: 'expanded'
        }))
        .pipe(plugin.autoprefixer({
            browsers: ['last 8 versions'],
            cascade: true
        }))
        .pipe(plugin.cleanCSS({
            level: 2,
            debug: true
        }, (details) => {
            console.log(`${details.name}: ${details.stats.originalSize}`);
            console.log(`${details.name}: ${details.stats.minifiedSize}`);
        }))
        .pipe(plugin.rename({
            basename: "style",
            suffix: ".min",
            extname: ".css"
        }))
        .pipe(dest(`${path.dist}assets/css`))
        .pipe(browserSync.stream());
}

/* =====================  js  ===================== */

function js() {
    return src(`${path.src.js}*.js`, {
            sourcemaps: true
        })
        .pipe(plugin.plumber({
            errorHandler: onError
        }))
        .pipe(plugin.include({
            extensions: 'js',
            hardFail: true,
            includePaths: [`${__dirname}/node_modules`, `${__dirname}/src/assets/js/components`]
        }))
        .pipe(plugin.uglify())
        .pipe(plugin.rename({
            suffix: ".min",
            extname: ".js"
        }))
        .pipe(dest(`${path.dist}assets/js`, {
            sourcemaps: true
        }))
}

/* =====================  png  ==================== */

function spritePng() {
    const spriteData = src(`${path.src.img}png/*.png`)
        .pipe(
            plugin.spritesmith({
                imgName: 'sprite.png',
                cssName: '_spritePng.sass',
                cssFormat: 'sass',
                algorithm: 'binary-tree',
                padding: 4,
                cssTemplate: `${path.src.sass}modules/spritePng.template.sass`
            })
        );
    const imgStream = spriteData.img.pipe(dest(path.src.img));
    const cssStream = spriteData.css.pipe(dest(`${path.src.sass}tmp/`));
    return merge2(imgStream, cssStream);
}

/* =====================  svg  ==================== */

function spriteSvg() {
    return src(`${path.src.img}svg/*.svg`)
        .pipe(plugin.plumber({
            errorHandler: onError
        }))
        .pipe(plugin.svgmin({
            js2svg: {
                pretty: true
            }
        }))
        .pipe(plugin.cheerio({
            run: $ => {
                $('[fill]').removeAttr('fill');
                $('[stroke]').removeAttr('stroke');
                $('[style]').removeAttr('style');
            },
            parserOptions: {
                xmlMode: true
            }
        }))
        .pipe(plugin.replace('&gt;', '>'))
        .pipe(plugin.spriteSVG({
            mode: {
                symbol: {
                    dest: './',
                    sprite: 'sprite.svg',
                    render: {
                        sass: {
                            dest: '../../assets/sass/tmp/_spriteSvg.sass',
                            template: `${path.src.sass}modules/spriteSvg.template.sass`
                        }
                    },
                    svg: {
                        xmlDeclaration: false,
                        doctypeDeclaration: false,
                        rootAttributes: {
                            style: 'display:none;',
                            'aria-hidden': 'true'
                        }
                    }
                }
            }
        }))
        .pipe(dest(path.src.img))
}

/* ===================  images  =================== */

function images() {
    return src([`${path.src.img}**/*.*`, `!${path.src.img}{png,svg}/*.*`])
        .pipe(plugin.cache(plugin.imagemin([
            plugin.imagemin.gifsicle({
                interlaced: true
            }),
            plugin.imagemin.jpegtran({
                progressive: true
            }),
            imageminJR({
                loops: 5,
                min: 65,
                max: 70,
                quality: 'medium'
            }),
            plugin.imagemin.svgo(),
            plugin.imagemin.optipng({
                optimizationLevel: 3
            }),
            pngquant({
                quality: [0.65, 0.7],
                speed: 5
            })
        ], {
            verbose: true
        })))
        .pipe(dest(`${path.dist}assets/img`));
}

/* ===================  fontgen  ================== */

function fontgen() {
    return src(`${path.src.fonts}**/*.ttf`)
        .pipe(plugin.fontmin())
        .pipe(plugin.ttf2woff2())
        .pipe(dest(path.src.fonts));
}

/* ====================  fonts  =================== */

function fonts() {
    return src(`${path.src.fonts}**/*.{svg,eot,ttf,woff,woff2}`)
        .pipe(dest(`${path.dist}assets/fonts`));
}

/* ====================  watch  =================== */

function watchFiles() {
    watch(path.src.html, html).on('change', reload);
    watch(path.src.sass, styles);
    watch(path.src.js, js).on('change', reload);
    watch(path.src.img, images);
    watch(`${path.src.img}png/*.png`, spritePng);
    watch(`${path.src.img}svg/*.svg`, spriteSvg);
}

/* ====================  clean  =================== */

function clean() {
    plugin.cache.clearAll();
    return del([
        path.dist,
        `${path.src.fonts}**/*.css`,
        `${path.src.sass}tmp`,
        `${path.src.img}sprite.{png,svg}`,
    ]).then(dir => {
        console.log('Deleted files and folders:\n', dir.join('\n'));
    });
}

/* ===================  build  ==================== */

const build = series(
    clean,
    spritePng,
    spriteSvg,
    parallel(html, styles, js, images, fonts),
    parallel(watchFiles, serve)
);

exports.html = html;
exports.styles = styles;
exports.js = js;
exports.images = images;
exports.spritePng = spritePng;
exports.spriteSvg = spriteSvg;
exports.fontgen = fontgen;
exports.fonts = fonts;
exports.clean = clean;
exports.default = build;