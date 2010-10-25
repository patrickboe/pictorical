from paver.easy import *
import paver.doctools
import yaml
import sys
import string
import re

config={"version": "0.1"}
deployDir = path("deploy")
src = path("src")

def appEngineCommand(pyname):
    return (options.app_engine_python_executable, 
                     path(options.app_engine_path) / pyname, 
                     deployDir.abspath())

@task 
def auto():   
    with open('my.yaml','r') as myYaml:
        config.update(yaml.load(myYaml))
    with open(src/"configs.yaml","r") as confYaml:
        config.update(yaml.load(confYaml)[config["configuration"]])
    options.update(config);

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
    def configure(templatedPath):
        for f in [a for a in templatedPath.files() if re.search("\.(yaml|js|html|djml|css)$",a)]:
            with open(f,'r') as fh:
                subbed=string.Template(fh.read()).safe_substitute(config)
            with open(f,'w') as fh:
                fh.write(subbed)
        for d in templatedPath.dirs():
            configure(d)
    "transform source code into a deployable google app"
    hyde = src / "resources" / "hyde" / "hyde.py"
    buildDir = src / "build"
    deployDir.rmtree()
    (src / "python").copytree(deployDir / "python")
    (src / "templates").copytree(deployDir / "templates")
    (src / "app.yaml").copy(deployDir / "app.yaml")
    sh("%s -g -s %s" % (hyde, buildDir))
    configure(deployDir)
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