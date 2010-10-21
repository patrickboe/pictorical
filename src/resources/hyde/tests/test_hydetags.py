"""

uses py.test

sudo easy_install py

http://codespeak.net/py/dist/test.html

"""
import os
import sys
import time as sleeper
from datetime import time, datetime, timedelta
import unittest

from django.conf import settings
from django.utils.html import strip_spaces_between_tags

TEST_ROOT = os.path.dirname(os.path.abspath(__file__))
ROOT = os.path.abspath(TEST_ROOT + "/..")

sys.path = [ROOT] + sys.path

from hydeengine.file_system import File, Folder
from hydeengine import url, Initializer, Generator, setup_env
from hydeengine.siteinfo import SiteNode, SiteInfo, Page
from hydeengine.site_post_processors import FolderFlattener

TEST_ROOT = Folder(TEST_ROOT)
TEST_SITE = TEST_ROOT.child_folder("test_site")
ORIGINAL_PRE_PROCESSORS = settings.SITE_PRE_PROCESSORS


def setup_module(module):
    Initializer(TEST_SITE.path).initialize(ROOT, template='test', force=True)
    setup_env(TEST_SITE.path)
    ORIGINAL_PRE_PROCESSORS = settings.SITE_PRE_PROCESSORS
    settings.SITE_PRE_PROCESSORS = {
            '/': {
                'hydeengine.site_pre_processors.NodeInjector' : {
                       'variable' : 'blog_node',
                       'path' : 'content/blog'
                }
            }
        }
    settings.LISTING_PAGE_NAMES = ['listing', 'index', 'default']

def teardown_module(module):
    TEST_SITE.delete()
    if ORIGINAL_PRE_PROCESSORS:
        settings.SITE_PRE_PROCESSORS = ORIGINAL_PRE_PROCESSORS

class TestHydeTags:

    def test_recent_posts(self):
        site = SiteInfo(settings, TEST_SITE.path)
        site.refresh()
        self.generator = Generator(TEST_SITE.path)
        self.generator.build_siteinfo()
        self.generator.pre_process(site)
        actual_resource = site.find_resource(File(site.content_folder.child('recent_posts.html')))
        self.generator.process(actual_resource)
        expected_text = File(
                TEST_ROOT.child("recent_posts_dest.html")).read_all()
        actual_text = actual_resource.temp_file.read_all()
        if ORIGINAL_PRE_PROCESSORS:
            settings.SITE_PRE_PROCESSORS = ORIGINAL_PRE_PROCESSORS
        assert expected_text == actual_text


