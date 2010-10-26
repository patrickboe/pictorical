from paver.easy import *
import string
import re
import sys

deployDir = path("deploy")
srcDir = path("src")
buildDir = srcDir / "build"
sys.path.append(buildDir.abspath())
from buildconfig import loadConf

options(version="0.1")

def appEngineCommand(pyname):
    return (options.app_engine_python_executable, 
                     path(options.app_engine_path) / pyname, 
                     deployDir.abspath())

@task 
def auto():   
    loadConf(options)

@task
def build():
    def combine(mediaPath, in_files, out_file, in_type='js'):
        "combine text files into one"
        out = open(mediaPath / ('%s.%s' % (out_file,in_type)), 'w')
        for f in in_files:
            f=mediaPath / ('%s.%s'%(f,in_type))
            with open(f) as fh:
                data = fh.read() + '\n'
            f.remove()
            out.write(data)
            print ' + %s' % f
        out.close()
    def configure():
        def applyConfig(curPath):
            for f in [a for a in curPath.files() if re.search("\.(yaml|js|html|djml|css)$",a)]:
                with open(f,'r') as fh:
                    subbed=string.Template(fh.read()).safe_substitute(config)
                with open(f,'w') as fh:
                    fh.write(subbed)
            for d in curPath.dirs():
                applyConfig(d)
        config=dict([("CONF_%s" % k,v) for (k,v) in options.iteritems()])
        config["CONF_version_name"] =  options.version.replace(".","-") + (options.debug and "-dev" or "-rel")
        applyConfig(deployDir)
    "transform source code into a deployable google app"
    hyde = srcDir / "resources" / "hyde" / "hyde.py"
    deployDir.rmtree()
    (srcDir / "python").copytree(deployDir / "python")
    (srcDir / "templates").copytree(deployDir / "templates")
    (buildDir / "app.yaml").copy(deployDir / "app.yaml")
    sh("%s -g -s %s" % (hyde, buildDir))
    configure()
    combine(deployDir/"media"/"js",
            [
             'index',
             'measure-maps',
             'jquery.ba-hashchange.min',
             'jquery.cycle.min',
             'jquery-ui-1.8.5.custom.min',
             'modernizr-1.5.min'
             ],'app')
    
@task
@needs('build')
def run():
    "start local google app engine server for this app"
    sh("%s %s %s" % appEngineCommand("dev_appserver.py"))
    
@task
@needs('build')
def deploy():
    "put the current application live"
    sh("%s %s update %s" % appEngineCommand("appcfg.py"))