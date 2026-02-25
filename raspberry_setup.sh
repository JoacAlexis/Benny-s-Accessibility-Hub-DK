#!/usr/bin/bash

#make virtual environment
sudo apt install python3-venv -y
python3 -m venv eyetrack
source eyetrack/bin/activate

#install packages for camera acess
sudo apt install git meson libcamera-dev #libjpeg-dev
sudo meson install

#install computer vision for face_detect .py
sudo apt install python3-opencv
sudo apt install opencv-data
# install mediapipe 
pip install --upgrade pip setuptools wheel
pip install mediapipe-rpi4



#install node.js for hub
curl -fsSL https://deb.nodesource.com/setup_24.x | sudo -E bash -
sudo apt install -y nodejs


 176  sudo apt install python3.9 python3.9-venv python3.9-dev
  177  sudo apt update
  178  sudo apt install -y make build-essential libssl-dev zlib1g-dev libbz2-dev libreadline-dev libsqlite3-dev curl llvm libncurses5-dev libncursesw5-dev xz-utils tk-dev libffi-dev liblzma-dev git
  179  curl https://pyenv.run | bash
  180  nano ~/.bashrc
  181  source ~/.bashrc
  182  pyenv install 3.9.18
  183  pyenv shell 3.9.18
  184  python -m venv mp_env
  185  source mp_env/bin/activate
  186  python --version
  187  pip install --upgrade pip
  188  pip install mediapipe
