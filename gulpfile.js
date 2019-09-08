const { src, dest, watch, series, parallel } = require('gulp');
const plugin = require('gulp-load-plugins')({
  rename: {
    'gulp-clean-css': 'cleanCSS',
    'gulp-svg-sprite': 'spriteSVG',
    'gulp-group-css-media-queries': 'gcmq',
    'gulp-html-prettify': 'prettify',
  },
});

const imageminJR = require('imagemin-jpeg-recompress');
const pngquant = require('imagemin-pngquant');
const merge2 = require('merge2');
const del = require('del');
const browserSync = require('browser-sync').create();

const webpack = require('webpack');
const stream = require('webpack-stream');
const TerserJSPlugin = require('terser-webpack-plugin');

const { reload } = browserSync;

const dev = plugin.environments.development;
const prod = plugin.environments.production;

const onError = err => {
  plugin.notify.onError({
    title: `Error in ${err.plugin}`,
    message: '<%= error.message %>',
    sound: 'Pop',
    onLast: true,
  })(err);
  this.emit('end');
};

const path = {
  src: {
    pug: 'src/pug/',
    scss: 'src/scss/',
    js: 'src/js/',
    img: 'src/img/',
    fonts: 'src/fonts/',
    static: 'src/static/',
  },
  assets: 'dist/assets/',
  dist: 'dist/',
};

/* ===============   webpackConfig  =============== */

const webpackConfig = {
  mode: dev() ? 'development' : 'production',
  output: {
    filename: `[name].js`,
  },
  devtool: dev() ? 'eval-source-map' : 'none',
  optimization: {
    minimizer: [new TerserJSPlugin({})],
    splitChunks: {
      chunks: 'all',
    },
  },
  module: {
    rules: [
      {
        test: /\.m?js$/,
        exclude: /node_modules/,
        use: {
          loader: 'babel-loader',
        },
      },
    ],
  },
  plugins: [
    new webpack.SourceMapDevToolPlugin({
      filename: '[file].map',
    }),
    new webpack.ProvidePlugin({
      $: 'jquery',
      jQuery: 'jquery',
      'window.jQuery': 'jquery',
    }),
  ],
  resolve: {
    modules: ['node_modules'],
  },
};

/* ===================   serve  =================== */

function serve() {
  browserSync.init({
    server: path.dist,
    // tunnel: 'project', // Demonstration page: http://project.localtunnel.me
    // online: false, // Work Offline Without Internet Connection
  });
}

/* =====================  pug  ==================== */

const emitty = require('emitty').setup(path.src.pug, 'pug', {
  makeVinylFile: true,
});

global.watch = true;
global.emittyChangedFile = {
  path: '',
  stats: null,
};

function pug() {
  return src(`${path.src.pug}*.pug`, { read: false })
    .pipe(
      plugin.plumber({
        errorHandler: onError,
      })
    )
    .pipe(
      plugin.if(
        global.watch,
        emitty.stream(
          global.emittyChangedFile.path,
          global.emittyChangedFile.stats
        )
      )
    )
    .pipe(
      plugin.pug({
        pretty: true,
      })
    )
    .pipe(plugin.prettify({ indent_char: ' ', indent_size: 2 }))
    .pipe(dest(path.dist))
    .pipe(browserSync.stream());
}

/* ====================  scss  ==================== */

function scss() {
  return src(`${path.src.scss}*.{scss,scss}`)
    .pipe(dev(plugin.sourcemaps.init()))
    .pipe(
      plugin.plumber({
        errorHandler: onError,
      })
    )
    .pipe(
      plugin.sass({
        outputStyle: 'expanded',
      })
    )
    .pipe(plugin.autoprefixer())
    .pipe(plugin.gcmq())
    .pipe(
      prod(
        plugin.cleanCSS(
          {
            level: 2,
            debug: true,
          },
          details => {
            console.log(`${details.name}: ${details.stats.originalSize}`);
            console.log(`${details.name}: ${details.stats.minifiedSize}`);
          }
        )
      )
    )
    .pipe(dev(plugin.sourcemaps.write('.')))
    .pipe(dest(`${path.assets}css`))
    .pipe(browserSync.stream());
}

/* =====================  js  ===================== */

function js() {
  return src(`${path.src.js}main.js`)
    .pipe(
      plugin.plumber({
        errorHandler: onError,
      })
    )
    .pipe(stream(webpackConfig))
    .pipe(dest(`${path.assets}js`));
}

/* =====================  png  ==================== */

function spritePng() {
  const spriteData = src(`${path.src.img}png/*.png`).pipe(
    plugin.spritesmith({
      imgName: 'sprite.png',
      cssName: '_spritePng.scss',
      cssFormat: 'scss',
      algorithm: 'binary-tree',
      padding: 4,
      cssTemplate: `${path.src.scss}utils/spritePng.template.scss`,
    })
  );
  const imgStream = spriteData.img.pipe(dest(path.src.img));
  const cssStream = spriteData.css.pipe(dest(`${path.src.scss}tmp/`));
  return merge2(imgStream, cssStream);
}

/* =====================  svg  ==================== */

function spriteSvg() {
  return (
    src(`${path.src.img}svg/*.svg`)
      .pipe(
        plugin.plumber({
          errorHandler: onError,
        })
      )
      .pipe(
        plugin.svgmin({
          js2svg: {
            pretty: true,
          },
        })
      )
      // .pipe(
      //   plugin.cheerio({
      //     run: $ => {
      //       $('[fill]').removeAttr('fill');
      //       $('[stroke]').removeAttr('stroke');
      //       $('[style]').removeAttr('style');
      //     },
      //     parserOptions: {
      //       xmlMode: true,
      //     },
      //   })
      // )
      .pipe(plugin.replace('&gt;', '>'))
      .pipe(
        plugin.spriteSVG({
          mode: {
            symbol: {
              dest: './',
              sprite: 'spriteSvg.svg',
              render: {
                scss: {
                  dest: '../scss/tmp/_spriteSvg.scss',
                  template: `${path.src.scss}utils/spriteSvg.template.scss`,
                },
              },
              svg: {
                xmlDeclaration: false,
                doctypeDeclaration: false,
                rootAttributes: {
                  style: 'display:none;',
                  'aria-hidden': 'true',
                },
              },
            },
          },
        })
      )
      .pipe(dest(path.src.img))
  );
}

/* ===================  images  =================== */

function img() {
  return src([`${path.src.img}**/*.*`, `!${path.src.img}{png,svg}/*.*`])
    .pipe(
      prod(
        plugin.cache(
          plugin.imagemin(
            [
              plugin.imagemin.gifsicle({
                interlaced: true,
              }),
              plugin.imagemin.jpegtran({
                progressive: true,
              }),
              imageminJR({
                loops: 5,
                min: 65,
                max: 70,
                quality: 'medium',
              }),
              plugin.imagemin.svgo(),
              plugin.imagemin.optipng({
                optimizationLevel: 3,
              }),
              pngquant({
                quality: [0.65, 0.7],
                speed: 5,
              }),
            ],
            {
              verbose: true,
            }
          )
        )
      )
    )
    .pipe(dest(`${path.assets}img`));
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
  return src(`${path.src.fonts}**/*.{svg,eot,ttf,woff,woff2}`).pipe(
    dest(`${path.assets}fonts`)
  );
}

/* ====================  move  ==================== */

function move() {
  return src(`${path.src.static}*.*`).pipe(dest(path.dist));
}

/* ====================  watch  =================== */

function watchFiles() {
  watch(`${path.src.pug}**/*.pug`, pug);
  watch(path.src.scss, scss);
  watch(path.src.js, js).on('change', reload);
  watch(path.src.img, img);
  watch(path.src.static, move);
  watch(`${path.src.img}png/*.png`, spritePng);
  watch(`${path.src.img}svg/*.svg`, spriteSvg);
}

/* ====================  clean  =================== */

function clean() {
  plugin.cache.clearAll();
  return del([
    path.dist,
    `${path.src.fonts}**/*.css`,
    `${path.src.scss}tmp`,
    `${path.src.img}spriteSvg.svg`,
    `${path.src.img}sprite.png`,
  ]).then(dir => {
    console.log('Deleted files and folders:\n', dir.join('\n'));
  });
}

/* ===================  exports  ================== */

exports.pug = pug;
exports.scss = scss;
exports.js = js;
exports.img = img;
exports.spritePng = spritePng;
exports.spriteSvg = spriteSvg;
exports.fontgen = fontgen;
exports.fonts = fonts;
exports.move = move;
exports.clean = clean;
exports.watch = watchFiles;

/* ====================  dev  ===================== */

exports.default = series(
  clean,
  // spritePng,
  // spriteSvg,
  parallel(move, pug, scss, js, img, fonts),
  parallel(watchFiles, serve)
);

/* ===================  build  ==================== */

exports.build = series(
  clean,
  // spritePng,
  // spriteSvg,
  parallel(move, pug, scss, js, img, fonts)
);
