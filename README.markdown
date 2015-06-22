# jCoverflip

Present your featured content elegantly. 

## jCoverflip has not been updated to work with the most recent versions of jQuery and jQuery UI! Proceed with caution!

## Quickstart

1. Install [jQuery 1.3+](http://docs.jquery.com/Downloading_jQuery), [jQuery UI 1.7.2](http://jqueryui.com/download), and [jCoverflip](https://nodeload.github.com/NewSignature/jcoverflip/zipball/master)
2. Call the following scripts in the `<head>` of your HTML document:

        <script type="text/javascript" src="jquery.js"></script>
        <script type="text/javascript" src="jquery.ui.js"></script>
        <script type="text/javascript" src="jquery.jcoverflip.js"></script>

3. Include the following CSS:

        .ui-jcoverflip {position: relative;}
        .ui-jcoverflip--item {position: absolute; display: block;}

4. Call .jcoverflip() on the parent element to create the slideshow.

        Ex:
        <ul id="flip">
          <li><a href="..."><img ...><span class="title">My title</span></a></li>
          <li><a href="..."><img ...><span class="title">My title</span></a></li>
          ...
        </ul>
        <script>
          $(function(){
            $('#flip').jcoverflip();
          });
        </script>

## Documentation

More detailed documentation can be found in our [GitHub wiki](/NewSignature/jcoverflip/wiki).


## License

Copyright New Signature 2010 - 2012

This program is free software: you can redistribute it and/or modify it under the terms of the 
GNU General Public License as published by the Free Software Foundation, either version 3 of the 
License, or (at your option) any later version.

This program is distributed in the hope that it will be useful, but WITHOUT ANY WARRANTY; 
without even the implied warranty of MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  
See the GNU General Public License for more details.

You should have received a copy of the GNU General Public License along with this program.  
If not, see <http://www.gnu.org/licenses/>.

You can contact New Signature by electronic mail at labs@newsignature.com 
or - by U.S. Postal Service at 1101 New York Ave NW, Suite 675, Washington, DC 20005.
