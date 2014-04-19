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
      templates: 'public/js/templates.js',
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
        files: {
          'public/fonts': 'web/css/fonts'
        }
      }
    },
    uglify: {
      js: {
        files: {
          'public/js/application.js': [
            'web/js/application.js',
            'public/js/templates.js'
          ]
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
            'node_modules/socket.io/node_modules/socket.io-client/dist/socket.io.min.js'
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
    'less',
    'express',
    'watch'
  ]);

  grunt.registerTask('production', [
    'clean',
    'less',
    'yaat',
    'copy',
    'uglify',
    'concat',
    'clean:templates',
    'express',
    'watch'
  ]);

};
