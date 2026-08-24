@echo off
cd /d "E:\955_WorkSpace\quote-studio"
echo ============================================
echo   Lyd9 Studio - Demo 服务器
echo   本机访问 :  http://localhost:8795/
echo   工作室局域网 :  http://%COMPUTERNAME%:8795/
echo                 (或本机内网 IP，如 http://192.168.x.x:8795/)
echo   关闭     :  直接关闭此窗口
echo ============================================
python -m http.server 8795 --directory "E:\955_WorkSpace\quote-studio\dist-single"
