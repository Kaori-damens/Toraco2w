import http.server, os, sys
os.chdir(os.path.join(os.path.dirname(__file__), "ball-battle"))
port = int(sys.argv[1]) if len(sys.argv) > 1 else 3456
http.server.test(HandlerClass=http.server.SimpleHTTPRequestHandler, port=port, bind="127.0.0.1")
