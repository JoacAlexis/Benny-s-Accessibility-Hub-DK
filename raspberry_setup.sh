#!/usr/bin/bash

#install packages for camera acess
sudo apt install git meson libcamera-dev #libjpeg-dev
sudo meson install

#install computer vision for face_detect .py
sudo apt install python3-opencv
sudo apt install opencv-data


#install node.js for hub
curl -fsSL https://deb.nodesource.com/setup_24.x | sudo -E bash -
sudo apt install -y nodejs


