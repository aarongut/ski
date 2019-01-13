#!/usr/bin/env python3

import argparse
import hashlib
import os
import subprocess
import sys

import boto3

BUCKET='ski.aarongutierrez.com'
DISTRIBUTION='ELFNI2LSHJUNK'

session = boto3.Session(profile_name='push')
s3 = session.client('s3')
cloudfront = session.client('cloudfront')

TYPE_MAP = {
    'css': 'text/css',
    'gif': 'image/gif',
    'html': 'text/html; charset=utf8',
    'jpg': 'image/jpeg',
    'js': 'application/javascript',
    'json': 'application/json',
    'png': 'image/png',
    'webp': 'image/webp',
}

CSS_FILE = 'site.css'
BUNDLE_FILE = 'dist/bundle.js'

def upload_file(filename, overwrite=True):
    print('Uploading {} to {}/{}'.format(filename, BUCKET, filename))
    ext = filename.split('.')[-1]

    if not overwrite:
        try:
            existing = s3.get_object(Bucket=BUCKET, Key=filename)
            print('\tSkipping existing key ', filename)
            return
        except:
            pass

    s3.upload_file(filename, BUCKET, filename, ExtraArgs={
        'ACL': 'public-read',
        'ContentType': TYPE_MAP[ext],
        'CacheControl': 'public, max-age={}'.format('86400' if ext == 'html' else '31536000')
    })
    print('\tDone.')

def set_default_object(key):
    config = cloudfront.get_distribution_config(Id=DISTRIBUTION)

    etag = config['ETag']
    distributionConfig = config['DistributionConfig']

    distributionConfig['DefaultRootObject'] = key

    print('Setting distribution {} to have root object {}'.format(DISTRIBUTION, key))
    cloudfront.update_distribution(Id=DISTRIBUTION,
                                   IfMatch=etag,
                                   DistributionConfig=distributionConfig)
    print('\tDone.')



def filter_filenames(filenames, ext):
    for f in filenames:
        if (isinstance(ext, (list,)) and (f.split('.')[-1] in ext) \
            or f.split('.')[-1] == ext):
            yield f

def file_sha(filename):
    output = subprocess.check_output(['shasum', '-a', '256', filename])
    return output.decode().split(' ')[0]

def upload_root():
    subprocess.check_call(['webpack'])

    css_sha = file_sha(CSS_FILE)
    css_filename = '{}.css'.format(css_sha)
    bundle_sha = file_sha(BUNDLE_FILE)
    bundle_filename = '{}.js'.format(bundle_sha)

    subprocess.check_call(['cp', CSS_FILE, css_filename])
    subprocess.check_call(['cp', BUNDLE_FILE, bundle_filename])

    with open('template.html', 'r') as f:
        template = f.read()

    index = template.format(css_filename, bundle_filename)
    h = hashlib.sha256()
    h.update(bytes(index, 'utf-8'))

    index_sha = h.hexdigest()
    index_filename = '{}.html'.format(index_sha)

    with open(index_filename, 'w') as f:
        f.write(index)

    upload_file(css_filename)
    upload_file(bundle_filename)
    upload_file(index_filename)

    subprocess.check_call(['rm', '-f', css_filename])
    subprocess.check_call(['rm', '-f', bundle_filename])
    subprocess.check_call(['rm', '-f', index_filename])

    set_default_object(index_filename)

def upload_bundle():
    upload_file('dist/bundle.js')

def upload_original():
    files = filter_filenames(os.listdir('img'), ['jpg', 'webp'])
    for f in files:
        upload_file('img/{}'.format(f), overwrite=False)

def upload_thumbnail(size):
    files = filter_filenames(os.listdir('img/{}'.format(size)), ['jpg', 'webp'])
    for f in files:
        upload_file('img/{0}/{1}'.format(size, f), overwrite=False)

def upload_images():
    upload_original()
    upload_thumbnail(200)
    upload_thumbnail(400)
    upload_thumbnail(600)
    upload_thumbnail(800)
    upload_thumbnail(1200)
    upload_thumbnail(1600)
    upload_file('img/data.json')



if __name__ == '__main__':
    parser = argparse.ArgumentParser(description='Publish ski.aarongutierrez.com')

    pub_help = 'What to publish'
    pub_choices = ['all', 'root', 'img']
    parser.add_argument('pub', choices=pub_choices, help=pub_help)

    args = parser.parse_args()

    if args.pub == 'root' or args.pub == 'all':
        upload_root()
    if args.pub == 'img' or args.pub == 'all':
        upload_images()

