# -*- coding: utf-8 -*-
{
    'name': "Search Paste from Excel",
    'summary': 'Paste several cells copied from Excel, or type values separated by commas, to search all of them at once',
    'description': """
        Search for a list of values copied from Excel (or any spreadsheet):
        - copy several cells (rows and/or columns) and paste them into the search bar of any view
        - or type several values separated by commas, e.g. S50000, S58878290
        - the search bar proposes every field of the search view that can hold all the pasted values
        - selecting a field adds one filter that matches any of the pasted values (exact match, not case sensitive)
    """,
    'author': "Hamid A Mohamed",
    'maintainer': "Hamid A Mohamed",
    'category': 'Productivity',
    'version': '20.0.1.0.0',
    'license': 'LGPL-3',
    'depends': ['web'],
    'assets': {
        'web.assets_backend': [
            'web_search_paste/static/src/search_bar_patch.js',
            'web_search_paste/static/src/search_bar_patch.xml',
            'web_search_paste/static/src/search_model_patch.js',
        ],
    },
    'images': ['static/description/banner.png'],
    'price': 0,
    'currency': 'USD',
    'installable': True,
    'auto_install': False,
    'application': False,
}
