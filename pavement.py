from paver.easy import *
import paver.doctools

options(
        env=Bunch(
                  appEngine="/opt/google/appengine",
                  python="python2.5"
                  )
        )

def combine(mediaPath, in_files, out_file, in_type='js'):
    "combine text files into one"
    out = open(mediaPath / ('%s.%s' % (out_file,in_type)), 'w')
    for f in in_files:
        f=mediaPath / ('%s.%s'%(f,in_type))
        fh = open(f)
        data = fh.read() + '\n'
        fh.close()
        f.remove()
        out.write(data)
        print ' + %s' % f
    out.close()

deploy = path("deploy")
src = path("src")

@task
def build():
    "transform source code into a deployable google app"
    hyde = src / "resources" / "hyde" / "hyde.py"
    buildDir = src / "build"
    deploy.rmtree()
    (src / "python").copytree(deploy / "python")
    (src / "templates").copytree(deploy / "templates")
    (src / "app.yaml").copy(deploy / "app.yaml")
    sh("%s -g -s %s" % (hyde, buildDir))
    combine(deploy/"media"/"js",
            [
             'index',
             'jquery.ba-hashchange.min',
             'jquery.cycle.min',
             'jquery-ui-1.8.5.custom.min',
             'modernizr-1.5.min'
             ],'app')
    
@task
@needs('build')
def localdeploy():
    "start local google app engine server for this app"
    sh("%s %s %s" % (options.env.python, path(options.env.appEngine) / "dev_appserver.py", deploy.abspath()))