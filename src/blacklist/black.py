import cgi
import os

from google.appengine.ext.webapp import template
from google.appengine.ext import webapp
from google.appengine.ext.webapp.util import run_wsgi_app
from google.appengine.ext import db

class BlacklistedFlickrUser(db.Model):
    id = db.StringProperty()
    date = db.DateTimeProperty(auto_now_add=True)

class Registration(webapp.RequestHandler):
    def get(self):
        self.show({'blacklist': BlacklistedFlickrUser.all().order('-date').fetch(10)})
        
    def post(self):
        addition = BlacklistedFlickrUser()
        addition.id=self.request.get('user')
        addition.put()
        self.show({'flickrUser':addition})
    
    def show(self, templateValues):
        path = os.path.join(os.path.dirname(__file__), 'add.gtm')
        self.response.out.write(template.render(path, templateValues))

application = webapp.WSGIApplication([('/blacklist/add', Registration)], debug=True)

def main():
    run_wsgi_app(application)

if __name__ == "__main__":
    main()