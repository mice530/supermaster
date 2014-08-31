
exports.killProcess = function(){
    try {
        process.kill.apply(process, arguments);
        return;
    } catch(err){
        return err;
    }
};

/**
 * Process stdout with template support
 * @method writeStdout
 */
exports.writeStdout = function(tmpl, options){    
    return process.stdout.write(exports.template(tmpl, options));
};

/**
 * @method template
 * @example
 *  // output: preffix valueToReplaceTheKey suffix
 *  template('preffix {{keyToBeReplaced}} suffix', {
 *      keyToBeReplaced: 'valueToReplaceTheKey'
 *  });
 */
exports.template = function(tmpl, options){
    var txt = tmpl;

    Object.keys(options || []).forEach(function(key){
        var re = new RegExp('\\{\\{' + key + '\\}\\}', 'mg');

        txt = txt.replace(re, options[key]);
    });

    return txt;
};