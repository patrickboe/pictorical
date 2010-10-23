from paver.easy import *
import paver.doctools

options(
        env=Bunch(
                  localAppEngine="/opt/google/appengine/"
                  )
        )

@task
def build():
    destDir = path("deploy")
    src = path("src")
    hyde = src / "resources" / "hyde" / "hyde.py"
    buildDir = src / "build"
    destDir.rmtree()
    (src / "python").copytree(destDir / "python")
    (src / "app.yaml").copy(destDir / "app.yaml")
    sh("%s -g -s %s" % (hyde, buildDir))
    
"""@task
@needs('build')
def localdeploy():
    sh()"""