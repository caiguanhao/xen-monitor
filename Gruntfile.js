module.exports = function(grunt) {

  grunt.initConfig({
    express: {
      server: {
        options: {
          script: 'xen-mon-app.js'
        }
      }
    },
    less: {
      application: {
        files: {
          'web/css/application.css': [ 'web/css/application.less' ]
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
  grunt.loadNpmTasks('grunt-contrib-less');

  grunt.registerTask('default', [
    'less',
    'express',
    'watch'
  ]);

};
