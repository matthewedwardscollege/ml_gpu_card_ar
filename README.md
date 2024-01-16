# ML GPU CardAR

<p align="center" width="100%"><img width="33.33%" src="https://github.com/matthewedwardscollege/ml_gpu_card_ar/blob/main/ml_gpu_card_ar.gif"></p>

##Try out ML GPU CardAR

The following link will allow you to use the ML GPU CardAR program in your browser. (All processing involving video input is done locally on your own computer.)

<a href="https://matthewedwardscollege.github.io/ml_gpu_card_ar/ml_gpu_card_ar_1/" target="_blank">https://matthewedwardscollege.github.io/ml_gpu_card_ar/ml_gpu_card_ar_1/</a>

##About ML GPU CardAR

I (Matthew Edwards) created this GitHub repository to demonstrate the program I described in my transfer application essay. This is the revised program that I described in the essay. I thought that it would make sense to provide evidence that this is a real project that I actually created. The source code of this project references a few open source JavaScript libraries including: TensorFlow https://www.tensorflow.org/, Teachable Machine https://teachablemachine.withgoogle.com/, and GLFX https://evanw.github.io/glfx.js/. While I used TensorFlow and Teachable Machine to train the neural network in this project that recognizes drawings, I created the training data and trained the neural network on my own hardware, and the weights.bin file was created specifically for this project. The drawings in the training data were produced by more than one person to account for individual differences in drawing styles. While Teachable Machine has the ability to classify objects in an image, as of writing this, Teachable Machine currently does not have the ability to create neural networks which provide bounding boxes for classified objects. The way I was able to get a model made with Teachable Machine to find the bounding box of an object in an image in addition to classifying objects was by using a combination of existing algorithms I called SFFA (Sobel Flood Fill Algorithm) in my original CardAR project. It is a combination of a GPU accelerated Sobel edge detection algorithm and a span filling flood fill algorithm.

Originally, in the previous version of this project https://github.com/matthewedwardscollege/card_ar, the program would take a text input written on a card and output an image. However, this version takes a simple drawing such as, a drawing of a cat, a drawing of a house, or a drawing of a happy face, and outputs a real image of what was drawn on the card. Previously, CardAR only used 2d rotation based on an approximation that averaged the angles found with arctan2 of each line segment between the 4 corner points of the card. The problem with this, is that if you think about a 3D coordinate system relative to your monitor, where x is the horizontal axis, y is the vertical axis, and z is going towards or away from your screen, it is possible to rotate a card in 3D space so that two adjacent corners of the card are both further away in the z direction than the other two adjacent corners. This results in a card, which as it exists in real 3D space, is a rectangle where opposite sides are of equal length which appears as an uneven quadrangle where opposite sides are not of equal length when it is projected onto the 2D screen of a computer. While it is possible to approximate this with a 2D rotation, much better results can be achieved using a projective transformation known as homography. GLFX is an open source JavaScript library that contains several GPU accelerated image effects including 3D perspective transformations. However, this is dependent on the corner finding algorithm accurately locating the corners of the card, which I have improved to be more accurate in this version of CardAR, although, I believe that it may still be possible to improve its accuracy.

Another improvement I made to the new version of CardAR is in the previous version, flood fills were either performed on boolean values or RGBA values individually. I have since realized that since RGBA values are stored using 8 bit unsigned integers, and 8 * 4 = 32, it is possible to view the arraybuffer representing the unsigned 8 bit RGBA pixel data as an unsigned 32 bit integer array. This has the advantage of being able to compare the equality of the R, G, B, and a values of two colors at the same by comparing one 32 bit integer instead of 4 8 bit integers. For example, instead of setting a color to white using “ui8c[4 * (y * width + x)] = 0xff; ui8c[4 * (y * width + x) + 1] = 0xff; ui8c[4 * (y * width + x) + 2] = 0xff; ui8c[4 * (y * width + x) + 3] = 0xff;” it is possible to set all four of these values at once using “ui32[y * width + x] = 0xffffffff;” which helps to reduce the complexity of code a lot. However, one issue is that while most modern CPUs either are little endian CPUs or CPUs with the ability to run in both little and big endian modes which are running operating systems which default to little endian, it is still important to check whether the CPU is little endian or big endian instead of assuming. For the color opaque white, since the R, G, B, and A values are all set to 0xff, there isn’t a reason to check for little endian vs big endian. However, for colors such as opaque black, which would normally be represented in a hex code as #000000ff, it is important to know whether the CPU is little endian or big endian, since setting a color to 0x000000ff in big endian mode will result in the color #ff000000 instead of #000000ff, which is completely transparent red, which is not the desired effect.

I have also added an “advanced” section to the program which shows step by step how the computer vision algorithm reduces the complexity of the image to something which is understandable by the computer. This includes a “summary” video which runs in a loop which fades between each step of the algorithm in order. First, the color image is converted to grayscale, then the black and white image is reduced to a Sobel edge detection image, where the darkness and lightness of regions are not preserved, then the image is thresholded, then the image is further reduced town to edges of a thickness of only one pixel, then these edges are categorized using a flood fill algorithm and are outlined in different colors to represent the boundaries of different boxes, then all of these objects and their bounding edge points are reduced down to only one object and many hundreds of edge points are reduced down to only the four corners of the card and the lines that connect them. After this, finally, the output image is shown, where the image corresponding to the drawing on the card is superimposed with 3D perspective over the card.

The old version of CardAR also used multiple processes in order to avoid lag. However, I have realized that using the optimizations stated above, along with using multiple render loops which run independently of each other for onscreen and offscreen processing (for example, the neural network does not need to run at the full 60Hz or 120Hz of a modern computer screen since the drawing does not actually change between every single frame), it is now possible to do everything on the main process. Additionally, the old version of CardAR used the browser recommended video input resolution (as in it doesn’t specify a resolution). This does not inherently mean that the video input is the full resolution the webcam is capable of recording at in real life, because browsers generally will downscale it to a lower resolution for more efficient livestreaming over WebRTC. However, it would take this arbitrary video input resolution and either upscale it (or much more likely downscale it) to have an area equivalent to 100 by 100 pixels. Do to the optimizations I have made, it is now possible to run the same algorithm (in terms of its approximate functionality not in terms of having exactly the same internal steps or output), at an input resolution of 500 by 500 pixels and an internal processing resolution of 500 by 500 pixels without using CPU parallelism. This is partially due to better design choices, for example, when finding the corners of an object, it is not necessary to loop over every single individual pixel that covers the area of the entire object, it is only necessary to use the perimeter, and it is also partially due to GPU utilization using WebGL, mainly to produce the Sobel edge detection image. However, computers generally suffer from a GPU to CPU and a CPU to GPU bottleneck. This means that if for example, it takes 16 milliseconds to perform a GPU operation on an image and then convert the GPU rendering context to an arraybuffer on the CPU, generally, the GPU operation, if it is a simple image filter, will almost always take less than 1 millisecond and the majority of the time is wasted simply transferring the data from the GPU back to the CPU. Because of this, it is good to reduce the number of calls to ctx.putImageData() and ctx.getImageData(), as these functions send and receive data from the CPU respectively. When the advanced section is open, many ctx.putImageData() calls are made in order to show the steps of the computer vision algorithm as it is progressing. However, most of these are not called while the main page is open. It is also a good design choice to perform as many GPU operations as possible without passing the data back to the CPU, and then doing all the CPU operations after the GPU operations instead of switching back and forth. This reduces the number of GPU to CPU performance bottlenecks. A design mistake I made in the original version of CardAR is I computed the mean average color of each object by calling ctx.getImageData() individually for each object instead of once for the entire video input. Relative to ctx.putImageData() and ctx.getImageData() calls, most of the CPU operations performed on raw pixel data in this program have a linear time complexity of O(n) if n is the number of pixels in the image. So compared to the GPU to CPU bottleneck, the time taken up by looping through pixels on the CPU in JavaScript is actually relatively negligible.

One remaining issue with this program that could be improved upon is the performance of the neural network used to classify the drawing on the card. Although Tensorflow is GPU accelerated, neural networks are generally not very computationally efficient. Because of this, the neural network is only called once every 500 milliseconds, and to combat classification inconsistency, the neural network contains a “neutral” classification (which was trained on random unrelated objects) which is ignored and instead, the program will default to the last non-neutral classification. This is because, if the neural network does not have 100% accuracy, and during the first step of a 500 millisecond interval, it detects a drawing of a cat, but 500 milliseconds later, it cannot classify the cat from the same card, without defaulting from the neutral classification to the last non-neutral classification, it would take 500 milliseconds before this could be corrected, which is very noticeable to the user.

## ML Output

<p align="center" width="100%"><img width="33.33%" src="https://github.com/matthewedwardscollege/ml_gpu_card_ar/blob/main/ml_output.png"></p>

The advanced page of the ML GPU CardAr program displays the live output data from the neural network. (Shown above.)

## Example Cards

<p align="center" width="100%"><img width="33.33%" src="https://github.com/matthewedwardscollege/ml_gpu_card_ar/blob/main/example_cards.jpeg"></p>

The ML GPU CardAR program currently supports 3 classes of objects: a drawing of a happy face, a cat, and a house. (Shown above.)
