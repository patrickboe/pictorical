from paver.easy import *
import string
import re
import sys

deployDir = path("deploy")
srcDir = path("src")
buildDir = srcDir / "build"
sys.path.append(buildDir.abspath())
from buildconfig import loadConf

options(
        version="0.1",
        version_date="09/27/2010"
        )

def appEngineCommand(pyname):
    return (options.app_engine_python_executable, 
                     path(options.app_engine_path) / pyname, 
                     deployDir.abspath())

@task 
def auto(): 
    "runs on every paver call"
    loadConf(options)     
    options.version_name=options.version.replace(".","-") + (options.debug and "-dev" or "")

@task
def build():
    "transform source code into a deployable google app"
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
    def configureFiles():
        """in all code files in the deploy directory, substitute strings of format 
        $CONF_[a key from pavement options] with the option's value"""
        def applyConfig(curPath):
            for f in [a for a in curPath.files() if re.search("\.(yaml|js|html|djml|css|py)$",a)]:
                with open(f,'r') as fh:
                    subbed=string.Template(fh.read()).safe_substitute(config)
                with open(f,'w') as fh:
                    fh.write(subbed)
            for d in curPath.dirs():
                applyConfig(d)
        config=dict([("CONF_%s" % k,v) for (k,v) in options.iteritems()])
        applyConfig(deployDir)
    hyde = srcDir / "resources" / "hyde" / "hyde.py"
    deployDir.rmtree()
    (srcDir / "python").copytree(deployDir / "python")
    (srcDir / "templates").copytree(deployDir / "templates")
    (buildDir / "app.yaml").copy(deployDir / "app.yaml")
    sh("%s -g -s %s" % (hyde, buildDir))
    configureFiles()
    mediaDir=deployDir/"media"
    combineName='app-%s' % options.version_name
    combine(mediaDir/"js",
            [
             'index',
             'measure-maps',
             'jquery.ba-hashchange.min',
             'jquery.cycle.min',
             'jquery-ui-1.8.5.custom.min',
             'modernizr-1.6.min'
             ],combineName)
    combine(mediaDir/"css",['index','jquery-ui-1.8.5.custom'], combineName,'css')
    
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