var map,
 activeSlide = 0,
 activeMapPosition = '',
 prezi = {},
 mapElem = $('#map'),
 owlMap = $('.owl-map'),
 owlMain = $('#owl-main');
 lastError = '';

$(document).ready(function() {
	if(checkCompatibility()){
		if (document.location.host) {
			var params = getJsonFromUrl();
			if(params.p)
				loadFromFile('./'+settings.media_dir+'/' + params.p + '.json');
			else				
				loadFromFile('./'+settings.media_dir+'/'+settings.default_prezi+'.json');
		}
	}
});

/////////////////////////////

function displayLastError()
{
	alert('error: ' + lastError);
}

function loadFromFile(fileName) {
	$.getJSON(fileName)
		.success(function(data) {
			prezi = data;
			if(loadPresentation())
				initUI();
			else
				displayLastError();
		})
		.fail(function(jqxhr, textStatus, error) {
			lastError = 'Cannot load prezentation data. '+ textStatus + ' ' + error;
			displayLastError();
		});
}

function loadPresentation() {
	if($.isEmptyObject(prezi)){
		lastError = 'Missing prezentation data.';
		return false;
	}
	for(var slideIndex in prezi.files) {
		switch(prezi.files[slideIndex].type){
		case 'img':
			item = document.createElement('div');
			$(item).addClass('item')
				.attr('data-hash', slideIndex)
				.html('<img class="owl-lazy" data-src="./'+settings.media_dir+'/'+prezi.mediaDir+'/'+prezi.files[slideIndex].src+'" class="fullscreen">')
				.appendTo(owlMain);
			break;
		case 'video':
			item = document.createElement('div');
				$(item).addClass('item')
					.attr('data-hash', slideIndex)
					.html('<video controls preload="none"><source src="./'+settings.media_dir+'/'+prezi.mediaDir+'/'+prezi.files[slideIndex].src+'">Your browser does not support the video tag.</video>')
					.appendTo(owlMain);
			break;
		case 'map':
			item = document.createElement('div');
			$(item).addClass('item').attr('data-hash', slideIndex).appendTo(owlMain);
			slideMap = document.createElement('div');
			$(slideMap).attr('id','slide'+slideIndex).addClass('owl-carousel owl-map').appendTo(item);
			positions = document.createElement('div');
			for(var posIndex in prezi.files[slideIndex].data) {
				position = document.createElement('div');
				$(position).addClass('position map-data-hidden')
					.attr('data-duration',  prezi.files[slideIndex].data[posIndex].duration)
					.attr('data-zoom', prezi.files[slideIndex].data[posIndex].zoom)
					.attr('data-bearing', prezi.files[slideIndex].data[posIndex].bearing)
					.attr('data-lat', prezi.files[slideIndex].data[posIndex].lat)
					.attr('data-lon', prezi.files[slideIndex].data[posIndex].lon)
					.attr('data-speed', prezi.files[slideIndex].data[posIndex].speed)
					.attr('data-curve', prezi.files[slideIndex].data[posIndex].curve)
					.attr('data-pitch', prezi.files[slideIndex].data[posIndex].pitch)
					.html(slideIndex+'.'+posIndex)
					.appendTo(positions);
			}
			$(positions).appendTo(slideMap);
			break;
		}
	}
	return true;
}

function checkCompatibility() {
	if(!mapboxgl.supported()) {
		lastError = 'Mapbox WebGL is not supported.';
		displayLastError();
		return false;
	}
	return true;
}

function initUI() {
	attachEvents();
	initMap();
	initOwl();
	attachEvents();
	unloadDropZone();
}

function initMap() {
	mapboxgl.accessToken = settings.mapbox_accessToken;
	map = new mapboxgl.Map({
		container: 'map',
		style: 'mapbox://styles/mapbox/outdoors-v9',
		zoom: 13,
		center: [16.2949,50.1162]
	});
}

function updateMapFromElement(elem)
{
	var position = {
			center: [elem.data('lon') == null ? 0 : elem.data('lon'), elem.data('lat') == null ? 0 : elem.data('lat')],
			bearing: elem.data('bearing') == null ? 0 : elem.data('bearing') ,
			zoom: elem.data('zoom') == null ? 10 : elem.data('zoom') ,
			speed: elem.data('speed') == null ? 1.2 : elem.data('speed'),
			curve: elem.data('curve') == null ? 1.42 : elem.data('curve'),
			pitch: elem.data('pitch') == null ? 0 : elem.data('pitch')
		}
	updateMap(position);
}

function updateMap(newPosition) 
{
	if(activeMapPosition === newPosition) 
		return;
	map.flyTo(newPosition);
	activeMapPosition = newPosition;
}

///////////////////


var lastMainChangeEvent, lastMainChangedEvent;
var currentSlide = 0;
function attachEvents(){
	owlMap.on('changed.owl.carousel', function(event) {
		if(event.item.index == null)
			return;
			
		var current = event.item.index;
		var elem = $(event.target).find('.owl-item').eq(current).find('div');
		updateMapFromElement(elem);
	});

	owlMain.on('change.owl.carousel', function(event) {
		if(event.target.id != 'owl-main' || event.property.name != 'position' || lastMainChangeEvent === event)
			return;
		lastMainChangeEvent = event;
			
		currentSlide = event.item.index == null ? 0 : event.item.index;
		var videoElem = $(event.target).find('.owl-item .item').eq(currentSlide).find('video');
		if(videoElem.length)
		{
			videoReset(videoElem.get(0));
			event.stopImmediatePropagation();
		}
	});
	
	owlMain.on('changed.owl.carousel', function(event) {
		if(event.target.id != 'owl-main' || event.property.name != 'position' || lastMainChangedEvent === event)
			return;
		lastMainChangedEvent = event;
			
		currentSlide = event.item.index == null ? 0 : event.item.index;
		var elem = $(event.target).find('.owl-item .item').eq(currentSlide);
		if(elem.find('.owl-map').length)
		{
			//Move map element to current slide
			mapElem.detach().prependTo(elem.find('.owl-map'));
			mapElem.removeClass('map-box-hidden');
			
			// Set current map position
			var active = elem.find('.owl-item.active .position');
			if(active.length == 0)
				active = elem.find('.owl-item .position').eq(0);
			updateMapFromElement(active);
		}
		if(elem.find('video').length)
		{
			videoPlay(elem.find('video').get(0));
		}
	});
	
	$('#nav').click(function(event) {
		event.stopImmediatePropagation();
		nav($(event.target).attr('class'));
	});
}		

function nav(direction){
	var elem = $(owlMain).find('.owl-item .item').eq(currentSlide);
	if(elem.find('.owl-map').length){
		var activeIndex = elem.find('.owl-item.active').index();
		bounder = direction == 'next' ? elem.find('.owl-item').length - 1 : 0;
		if(bounder != activeIndex)
			elem.find('.owl-map .owl-'+direction).click();
		else
			owlMain.trigger(direction+'.owl.carousel');	
	}else
		owlMain.trigger(direction+'.owl.carousel');
}

function videoPlay(elem) {
	var video = elem;
	if(video.paused)
		video.play();
	else
		video.pause();
}

function videoReset(elem) {
	var video = elem;
	video.pause();
	video.currentTime = 0;
}
			
function initOwl() {
	owlMap = $('.owl-map').owlCarousel({
		items: 1,
		loop:false,
		mouseDrag:false,
		touchDrag:false,
		margin:10,
		nav:true,
		nestedItemSelector: 'position'
	});

	owlMain = $('#owl-main').owlCarousel({
		items: 1,
		loop:false,
		//mouseDrag:false,
		//touchDrag:false,
		lazyLoad:true,
		margin:10,
		nav:true,
		URLhashListener:true,
		startPosition: 'URLHash'
	});
}

function unloadDropZone() {
	$('#drop-zone').remove();
}
	
$(document).on('keydown', function(e){
    var direction = e.which == 39? 'next': null,
        direction = e.which == 37? 'prev': direction;
    nav(direction);
});


/////////////////////// Utils

function getJsonFromUrl() {
  var query = location.search.substr(1);
  var result = {};
  query.split("&").forEach(function(part) {
    var item = part.split("=");
    result[item[0]] = decodeURIComponent(item[1]);
  });
  return result;
}