from paver.easy import *
import string
import re
import sys
import subprocess

deployDir = path("deploy")
srcDir = path("src")
buildDir = srcDir / "build"
sys.path.append(buildDir.abspath())
from buildconfig import loadConf

options(
        version="0.2.9",
        version_date="11/06/2010",
        targetEnv="local"
        )

def appEngineCommand(pyname, args=[]):
    def report(status):
        sys.stderr.writelines(["%s: " % status, " ".join(cmd)])
    cmd=[options.app_engine_python_executable, 
        path(options.app_engine_path) / pyname]
    cmd.extend(args)
    cmd.append(deployDir.abspath())
    try:
        retcode=subprocess.call(cmd)
        if retcode < 0:
            report("terminated")
        else:
            report("completed")
    except KeyboardInterrupt:
        pass

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
    options.update(options.get(options.targetEnv))
    configureFiles()
    mediaDir=deployDir/"media"
    combineName='app-%s' % options.version_name
    combine(mediaDir/"js",
            [
             'measure-maps',
             'jquery.ba-hashchange.min',
             'index'
             ],combineName)
    combine(mediaDir/"css",['index','jquery-ui-1.8.5.custom'], combineName,'css')
    
@task
@needs('build')
def run():
    "start local google app engine server for this app"
    appEngineCommand("dev_appserver.py",["--port=%d" % options.app_engine_portnum])

@task
def setlive():
    options.targetEnv="live"

@task
@needs('setlive','build')
def deploy():
    "put the current application live"
    appEngineCommand("appcfg.py",["update"])