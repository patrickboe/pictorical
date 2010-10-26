import yaml
import os

def loadConf(mapping):
    thisDir=os.path.dirname(__file__)
    with open(os.path.join(thisDir,'my.yaml'),'r') as myYaml:
        mapping.update(yaml.load(myYaml))
    with open(os.path.join(thisDir,"configs.yaml"),"r") as confYaml:
        mapping.update(yaml.load(confYaml)[mapping.get("configuration")])