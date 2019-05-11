"use strict";

const {
    src,
    dest,
    watch,
    series,
    parallel,
} = require('gulp');
const sass = require('gulp-sass');
const autoprefixer = require('gulp-autoprefixer');
const cleanCSS = require('gulp-clean-css');
const rename = require('gulp-rename');
const include = require('gulp-include');
const uglify = require('gulp-uglify');
const cache = require('gulp-cache');
const imagemin = require('gulp-imagemin');
const imageminJR = require('imagemin-jpeg-recompress');
const pngquant = require('imagemin-pngquant');
const spritesmith = require('gulp.spritesmith');
const merge2 = require('merge2');
const svgmin = require('gulp-svgmin');
const cheerio = require('gulp-cheerio');
const replace = require('gulp-replace');
const spriteSVG = require('gulp-svg-sprite');
const del = require('del');
const fontmin = require('gulp-fontmin');
const ttf2woff2 = require('gulp-ttf2woff2');
const notify = require("gulp-notify");
const plumber = require("gulp-plumber");
const browserSync = require("browser-sync").create();
const reload = browserSync.reload;

const onError = err => {
    notify.onError({
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
        .pipe(include())
        .pipe(dest(path.dist))
}

/* ===================  styles  =================== */

function styles() {
    return src(`${path.src.sass}*.sass`)
        .pipe(plumber({
            errorHandler: onError
        }))
        .pipe(sass({
            outputStyle: 'expanded'
        }))
        .pipe(autoprefixer({
            browsers: ['last 8 versions'],
            cascade: true
        }))
        .pipe(cleanCSS({
            level: 2,
            debug: true
        }, (details) => {
            console.log(`${details.name}: ${details.stats.originalSize}`);
            console.log(`${details.name}: ${details.stats.minifiedSize}`);
        }))
        .pipe(rename({
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
        .pipe(plumber({
            errorHandler: onError
        }))
        .pipe(include({
            extensions: 'js',
            hardFail: true,
            includePaths: [`${__dirname}/node_modules`, `${__dirname}/src/assets/js/components`]
        }))
        .pipe(uglify())
        .pipe(rename({
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
            spritesmith({
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
        .pipe(plumber({
            errorHandler: onError
        }))
        .pipe(svgmin({
            js2svg: {
                pretty: true
            }
        }))
        .pipe(cheerio({
            run: $ => {
                $('[fill]').removeAttr('fill');
                $('[stroke]').removeAttr('stroke');
                $('[style]').removeAttr('style');
            },
            parserOptions: {
                xmlMode: true
            }
        }))
        .pipe(replace('&gt;', '>'))
        .pipe(spriteSVG({
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
        .pipe(cache(imagemin([
            imagemin.gifsicle({
                interlaced: true
            }),
            imagemin.jpegtran({
                progressive: true
            }),
            imageminJR({
                loops: 5,
                min: 65,
                max: 70,
                quality: 'medium'
            }),
            imagemin.svgo(),
            imagemin.optipng({
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
        .pipe(fontmin())
        .pipe(ttf2woff2())
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
    cache.clearAll();
    return del([
        path.dist,
        `${path.src.fonts}**/*.css`,
        `${path.src.sass}tmp/*.*`,
        `${path.src.img}sprite.{png,svg}`,
    ]).then(dir => {
        console.log('Deleted files and folders:\n', dir.join('\n'));
    });
}

/* ===================  build  ==================== */

const build = series(
    clean,
    // spritePng,
    // spriteSvg,
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