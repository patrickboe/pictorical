import os
from google.appengine.ext import webapp
from google.appengine.ext.webapp import template

class RequestHandler(webapp.RequestHandler):
	def handle_exception(self, exception, debug_mode):
		import sys
		import traceback
		def report(target):
			exc_type, exc_value, exc_traceback = sys.exc_info()
			traceback.print_exception(exc_type, exc_value, exc_traceback,5,target)
		self.error(500)
		if debug_mode:
			report(self.response.out)
		else:
			self.handle('error.html')
			report(sys.stderr)
			
	def __display(self,templateName,templateValues,traversal):
		root=os.path.dirname(os.path.dirname(__file__))
		templatePath=os.path.join(traversal(root),templateName)
		self.response.out.write(template.render(templatePath, templateValues))
	
	def render(self,templateName,templateValues={}):
		self.__display(templateName,templateValues,lambda loc: os.path.join(loc,'templates'))
	
	def handle(self,templateName):
		self.__display(templateName,{},lambda loc: os.path.join(loc,'handlers'))
		
class NotFound(RequestHandler):
	def __show(self):
		self.error(404)
		self.handle("nonesuch.html")
	def post(self):
		self.__show()
	def get(self):
		self.__show()

handlers=[('.*',NotFound),]
	