# Gulp4 starter-kit

### Installation

1.  `git clone https://github.com/motrdevua/gulp4-starter-kit.git`
2.  `npm install`

### Generate required fonts (ttf, eot, woff, woff2, svg) from a ttf file

1.  Put ttf file to the directory `'src/assets/fonts/'`.
2.  Run `gulp fontgen`
3.  Find file: `'src/sass/parts/_fonttylesheet.sass'`.
4.  Add font name like: `+font-face('fontname', '../fonts/fontname')`

-   Example:
-     +font-face('Lato-Heavy', '../fonts/Lato-Heavy')

### How to use sprites

#### PNG

1.  Uncomment `'spritePng'` in `'build'` task gulpfile.js.
2.  Put *.png icons into folder `src/assets/img/png`.
3.  Uncomment this strings:
-     @import modules/mixin-spritePng
      @import tmp/spritePng
    in `'src/assets/sass/main.sass'`.
4.  Put icon into sass file with mixin `+sprite($iconName)`

- Example: 
-     .icon
          +sprite($location)

#### SVG

1.  Uncomment string `@import tmp/spriteSvg` in `'src/sass/main.sass'`.
2.  Uncomment string `//- include ../../img/sprite.svg` in `'src/pug/pages/index.pug'`.
3.  Uncomment task `'sprite:svg'` in `'build'` task gulpfile.js
4.  Put icon into pug file with mixin `+icon('iconName','iconModificator')`

---

### Run build

`npm run build` or `gulp`

### Clean

`npm run clean` or `gulp clean`

---

_Enjoy!_
