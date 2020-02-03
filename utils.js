const fs = require('fs');
const stylus = require('stylus');
const path = require('path');

module.exports = {

    checkForComposes(src) {
        return src.includes('composes');
    },

    extractCSSFromComposedFile(src, appDir, pathToStyles) {
        let originalSource = src;
        const hasComposes = originalSource.includes('composes');
        if ( hasComposes ) {
            //grab the file thats is used for composes
            const lines = originalSource.match(/\bcomposes\W+(?:\w+\W+){1,2}?from\b.*/g);
            
            let newStr;
            lines.map(line => {
                //extract the file name from line containing composes, 
                const composedFileName = path.resolve(appDir, pathToStyles +  line.substring(line.indexOf('!')+2, line.length-1));
                const strComposed = fs.readFileSync(composedFileName , 'utf8')
                const composedRender = stylus(strComposed).render();
                newStr = composedRender + originalSource + `\n`;
            })
            //replace the source with the source of the compiled file
            originalSource = newStr.replace(/from.*?[\n|\z]/g, `\n`);
            return originalSource;

        } else {
            return originalSource;
        }

    },
}