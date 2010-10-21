from setuptools import setup, find_packages

setup(name='hyde',
      version='0.4',
      description='static site generator',
      packages=find_packages(),
      scripts=("hyde.py",),
      install_requires=(
          'django',
          'pyYAML',
          'markdown2',
          'pygments',
          'pyrss2gen',
      ),
)
