function handleFileSelect(evt) {
	evt.stopPropagation();
    evt.preventDefault();
    
    var files = evt.dataTransfer.files; // FileList object

	for (var i = 0, f; f = files[i]; i++) {
		var extension = f.name.split('.').pop().toLowerCase();  //file extension from input file
		if(extension != 'json')
			continue;

		var reader = new FileReader();

		// Closure to capture the file information.
		reader.onload = (function(theFile) {
			return function(e) {
				prezi = JSON.parse(e.target.result);
				if(loadPresentation())
					initUI();
				else
					displayLastError();
			};
		})(f);

		// Read in the image file as a data URL.
		reader.readAsText(f);
    }
}

function handleDragOver(evt) {
	evt.stopPropagation();
	evt.preventDefault();
	evt.dataTransfer.dropEffect = 'copy'; // Explicitly show this is a copy.
}
  
$(document).ready(function() {
  // Setup the dnd listeners.
  var dropZone = document.getElementById('drop-zone');
  dropZone.addEventListener('dragover', handleDragOver, false);
  dropZone.addEventListener('drop', handleFileSelect, false);
});
