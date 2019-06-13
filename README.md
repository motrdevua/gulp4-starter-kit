# Gulp4 starter-kit

## Installation

1.  `git clone https://github.com/motrdevua/gulp4-starter-kit.git`
2.  `yarn` or `npm install`

### Generate required fonts (ttf, eot, woff, woff2, svg) from a ttf file

1.  Put ttf file to the directory `'src/assets/fonts/'`.
2.  Run `gulp fontgen`
3.  Find file: `'src/assets/styles/parts/_fonttylesheet.scss'`.
4.  Add font name like: `@include font-face('fontname', '../fonts/fontname');`

- Example:
-     @include font-face("Lato-Heavy", "../fonts/Lato-Heavy");

### How to use sprites

#### PNG

1.  Uncomment `'spritePng'` in `'build'` task in `gulpfile.js`.
2.  Put \*.png icons into folder `src/assets/img/png`.
3.  Find `'main.scss'` and uncomment strings:

-     @import modules/mixin-spritePng
      @import tmp/spritePng

4.  Put icon into scss file with mixin `@include sprite($iconName)`

- Example:
-     .icon {
        @include sprite($location);
      }

#### SVG

1.  Uncomment `'spriteSvg'` in `'build'` task in `gulpfile.js`
2.  Uncomment string `@import tmp/spriteSvg` in `'main.scss'`.
3.  Uncomment string `//= require assets/img/sprite.svg` in `index.html`
4.  Put icon into html:

-     <svg class="icon iconName">
          <use xlink:href="#iconName"></use>
      </svg>

---

### Run build

`gulp` or `yarn build` or `npm run build`

### Clean

`gulp clean` or `yarn clean` or `npm run clean`

---

_Enjoy!_
