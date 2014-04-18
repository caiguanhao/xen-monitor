module.exports = function(grunt) {

  grunt.initConfig({
    express: {
      server: {
        options: {
          script: 'xen-mon-app.js'
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
      html: {
        files: [ 'web/' ]
      }
    }
  });

  grunt.loadNpmTasks('grunt-contrib-watch');
  grunt.loadNpmTasks('grunt-express-server');

  grunt.registerTask('default', [
    'express',
    'watch'
  ]);

};
