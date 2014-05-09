module.exports = function(grunt) {

  grunt.initConfig({
    express: {
      server: {
        options: {
          script: 'xen-mon-app.js'
        }
      }
    },
    clean: {
      generated: [ 'public/js/templates.js', 'public/js/hotkeys.js' ],
      public: 'public/*'
    },
    less: {
      application: {
        files: {
          'public/css/application.css': [ 'web/css/application.less' ]
        }
      }
    },
    copy: {
      index: {
        files: {
          'public/index.html': 'web/index.production.html'
        }
      },
      fonts: {
        expand: true,
        cwd: 'web/css/fonts/',
        src: '*',
        dest: 'public/fonts/'
      }
    },
    uglify: {
      js: {
        files: {
          'public/js/application.js': [
            'web/js/application.js',
            'public/js/templates.js'
          ],
          'public/js/hotkeys.js': 'web/js/vendor/hotkeys.js'
        }
      }
    },
    concat: {
      js: {
        files: {
          'public/js/angular.js': [
            'web/js/vendor/angular.min.js',
            'web/js/vendor/angular-route.min.js'
          ],
          'public/js/vendors.js': [
            'node_modules/socket.io/node_modules/socket.io-client/dist/socket.io.min.js',
            'public/js/hotkeys.js'
          ]
        }
      }
    },
    yaat: {
      XenMonApp: {
        files: {
          'public/js/templates.js': 'web/index.html'
        }
      }
    },
    watch: {
      options: {
        livereload: true
      },
      grunt: {
        files: [ 'Gruntfile.js' ]
      },
      express: {
        files: [ 'xen-mon-app.js' ],
        tasks: [ 'express' ],
        options: {
          spawn: false,
          livereload: false
        }
      },
      js: {
        files: [ 'web/**/*.js' ]
      },
      css: {
        files: [ 'web/**/*.css', 'web/**/*.less', '!web/css/application.css' ],
        tasks: [ 'less' ]
      },
      html: {
        files: [ 'web/**/*.html' ]
      }
    }
  });

  grunt.loadNpmTasks('grunt-contrib-watch');
  grunt.loadNpmTasks('grunt-express-server');
  grunt.loadNpmTasks('grunt-contrib-copy');
  grunt.loadNpmTasks('grunt-contrib-concat');
  grunt.loadNpmTasks('grunt-contrib-uglify');
  grunt.loadNpmTasks('grunt-contrib-clean');
  grunt.loadNpmTasks('grunt-contrib-less');
  grunt.loadNpmTasks('grunt-yet-another-angular-templates');

  grunt.registerTask('default', [
    'clean',
    'less',
    'copy:fonts',
    'express',
    'watch'
  ]);

  grunt.registerTask('production', [
    '_production',
    'clean',
    'less',
    'yaat',
    'copy',
    'uglify',
    'concat',
    'clean:generated',
    'hash',
    'compress'
  ]);

  grunt.registerTask('_production', 'Update configs for production mode.',
    function() {
    var less = grunt.config('less') || {};
    less.options = less.options || {};
    less.options.cleancss = true;
    grunt.config('less', less);
    grunt.log.ok('Grunt configs updated.');
  });

  grunt.registerTask('hash', 'Compress assets files', function() {
    var crypto = require('crypto'), fs = require('fs');
    var publicdir = fs.realpathSync('public');
    var pdl = publicdir.length;
    var files = grunt.file.expand({
      cwd: publicdir
    }, ['css/*.css', 'js/*.js']);
    var hashes = {};
    var prodindex = publicdir + '/index.html';
    var prodindexcontent = fs.readFileSync(prodindex).toString();
    for (var i = 0; i < files.length; i++) {
      var old_src = '/' + files[i];
      var old_filename = publicdir + old_src;
      if (!fs.existsSync(old_filename)) continue;
      var file = fs.readFileSync(old_filename);
      var shasum = crypto.createHash('sha1');
      shasum.update(file);
      var hash = shasum.digest('hex');
      hashes['/' + files[i]] = hash;
      var dot = files[i].lastIndexOf('.');
      if (dot === -1) dot = undefined;
      var new_src = files[i].replace(/-[a-f0-9\-]{40,}\..+?$/, '');
      new_src = new_src.slice(0, dot);
      new_src += '-' + hash + files[i].slice(dot);
      new_src = '/' + new_src;
      var new_filename = publicdir + new_src;
      if (old_filename === new_filename) {
        grunt.log.ok('File ' + old_filename.slice(pdl).cyan + ' OK.');
      } else {
        fs.renameSync(old_filename, new_filename);
        prodindexcontent = prodindexcontent.replace(old_src, new_src);
        grunt.log.ok('File ' + old_filename.slice(pdl).cyan +
          ' has been renamed to ' + new_filename.slice(pdl).cyan);
      }
    }
    var hashstr = JSON.stringify(hashes, null, 2);
    prodindexcontent = prodindexcontent.replace(
      /^((\s*).*){\/\*%ASSETS%\*\/}/mg,
      function(a, p1, p2) {
      return p1 + hashstr.replace(/^/mg,
        Array(p2.length + 1).join(' ')).trim();
    });
    grunt.file.write(prodindex, prodindexcontent);
    grunt.log.ok('File ' + prodindex.slice(pdl).cyan + ' updated');
    var assetsjson = 'assets.json';
    grunt.file.write(assetsjson, hashstr);
    grunt.log.ok('File ' + assetsjson.cyan + ' updated');
  });

  grunt.registerTask('compress', 'Compress assets files', function() {
    var finish = this.async();
    var fs = require('fs');
    var exec = require('child_process').exec;
    exec('gzip -f1k css/*.css js/*.js', {
      cwd: fs.realpathSync('public')
    }, function(error, stdout, stderr) {
      if (stderr) grunt.fail.fatal(stderr);
      if (error) grunt.fail.fatal(error);
      grunt.log.ok('Asset files compressed.')
      finish();
    });
  });

};
