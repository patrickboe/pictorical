from paver.easy import *
import paver.doctools

options(
        env=Bunch(
                  appEngine="/opt/google/appengine", #location of your local app engine scripts
                  appEnginePython="python2.5" #name of a python exe that will work with app engine
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

deployDir = path("deploy")
src = path("src")

@task
def build():
    "transform source code into a deployable google app"
    hyde = src / "resources" / "hyde" / "hyde.py"
    buildDir = src / "build"
    deployDir.rmtree()
    (src / "python").copytree(deployDir / "python")
    (src / "templates").copytree(deployDir / "templates")
    (src / "app.yaml").copy(deployDir / "app.yaml")
    sh("%s -g -s %s" % (hyde, buildDir))
    combine(deployDir/"media"/"js",
            [
             'index',
             'jquery.ba-hashchange.min',
             'jquery.cycle.min',
             'jquery-ui-1.8.5.custom.min',
             'modernizr-1.5.min'
             ],'app')
    
@task
@needs('build')
def run():
    "start local google app engine server for this app"
    sh("%s %s %s" % (options.env.appEnginePython, path(options.env.appEngine) / "dev_appserver.py", deployDir.abspath()))
    
@task
@needs('build')
def deploy():
    "put the current application live"
    sh("%s %s update %s" % (options.env.appEnginePython, path(options.env.appEngine) / "appcfg.py", deployDir.abspath()))