import os
import commands
import re
import sys
from django.template.loader import render_to_string
from django.conf import settings
from file_system import File
from subprocess import check_call, CalledProcessError

class TemplateProcessor:
    @staticmethod
    def process(resource):
        try:
            rendered = render_to_string(resource.source_file.path, settings.CONTEXT)
            resource.source_file.write(rendered)
        except:
            print >> sys.stderr, \
            "***********************\nError while rendering page %s\n***********************" % \
            resource.url
            raise


## aym-cms code refactored into processors.
class CleverCSS:
    @staticmethod
    def process(resource):
        import clevercss
        data = resource.source_file.read_all()
        out = clevercss.convert(data)
        resource.source_file.write(out)

class HSS:
    @staticmethod
    def process(resource):
        out_file = File(resource.source_file.path_without_extension + ".css")
        hss = settings.HSS_PATH
        if not hss or not os.path.exists(hss):
            raise ValueError("HSS Processor cannot be found at [%s]" % hss)
        status, output = commands.getstatusoutput(
        u"%s %s -output %s/" % (hss, resource.source_file.path, out_file.parent.path))
        if status > 0:
            print output
            return None
        resource.source_file.delete()
        out_file.copy_to(resource.source_file.path)
        out_file.delete()

class SASS:
    @staticmethod
    def process(resource):
        out_file = File(resource.source_file.path_without_extension + ".css")
        sass = settings.SASS_PATH
        if not sass or not os.path.exists(sass):
            raise ValueError("SASS Processor cannot be found at [%s]" % sass)
        status, output = commands.getstatusoutput(
        u"%s %s %s" % (sass, resource.source_file.path, out_file))
        if status > 0:
            print output
            return None
        resource.source_file.delete()

class LessCSS:
    @staticmethod
    def process(resource):
        out_file = File(resource.source_file.path_without_extension + ".css")
        if not out_file.parent.exists:
            out_file.parent.make()
        less = settings.LESS_CSS_PATH
        if not less or not os.path.exists(less):
            raise ValueError("Less CSS Processor cannot be found at [%s]" % less)
        try:
            check_call([less, resource.source_file.path, out_file.path])
        except CalledProcessError, e:
            print 'Syntax Error when calling less'
            raise
        else:
            resource.source_file.delete()
        if not out_file.exists:
            print 'Error Occurred when processing with Less'

class YUICompressor:
    @staticmethod
    def process(resource):
        if settings.YUI_COMPRESSOR == None:
            return
        compress = settings.YUI_COMPRESSOR
        if not os.path.exists(compress):
            compress = os.path.join(
                    os.path.dirname(
                    os.path.abspath(__file__)), "..", compress)

        if not compress or not os.path.exists(compress):
            raise ValueError(
            "YUI Compressor cannot be found at [%s]" % compress)

        tmp_file = File(resource.source_file.path + ".z-tmp")
        status, output = commands.getstatusoutput(
        u"java -jar %s %s > %s" % (compress, resource.source_file.path, tmp_file.path))
        if status > 0:
            print output
        else:
            resource.source_file.delete()
            tmp_file.move_to(resource.source_file.path)

class ClosureCompiler:
    @staticmethod
    def process(resource):
        compress = settings.CLOSURE_COMPILER
        if not os.path.exists(compress):
            compress = os.path.join(
                    os.path.dirname(
                    os.path.abspath(__file__)), "..", compress)

        if not compress or not os.path.exists(compress):
            raise ValueError(
            "Closure Compiler cannot be found at [%s]" % compress)

        tmp_file = File(resource.source_file.path + ".z-tmp")
        status, output = commands.getstatusoutput(
        u"java -jar %s --js=%s --js_output_file=%s" % (compress, resource.source_file.path, tmp_file.path))
        if status > 0:
            print output
        else:
            resource.source_file.delete()
            tmp_file.move_to(resource.source_file.path)

class Thumbnail:
    @staticmethod
    def process(resource):
        from PIL import Image

        i = Image.open(resource.source_file.path)
        i.thumbnail(
            (settings.THUMBNAIL_MAX_WIDTH, settings.THUMBNAIL_MAX_HEIGHT),
            Image.ANTIALIAS
        )

        orig_path, _, orig_extension = resource.source_file.path.rpartition('.')
        if "THUMBNAIL_FILENAME_POSTFIX" in dir(settings):
            postfix = settings.THUMBNAIL_FILENAME_POSTFIX
        else:
            postfix = "-thumb"
        thumb_path = "%s%s.%s" % (orig_path, postfix, orig_extension)

        if i.format == "JPEG" and "THUMBNAIL_JPEG_QUALITY" in dir(settings):
            i.save(thumb_path, quality = settings.THUMBNAIL_JPEG_QUALITY, optimize = True)
        else:
            i.save(thumb_path)