function Case(options) {
	this.init(options);
}

Case.prototype.init = function(options) {
	var that = this;

	this.elements = {};
	this.elements.$pageContainer = options.$pageContainer;
	this.elements.$currentPage = this.elements.$pageContainer.find('.js-current-page');
	this.elements.$lastPage = this.elements.$pageContainer.find('.js-last-page');
	this.elements.$navigationPrev = this.elements.$pageContainer.find('.js-navigation-prev');
	this.elements.$navigationNext = this.elements.$pageContainer.find('.js-navigation-next');
	this.elements.$slides = this.elements.$pageContainer.find('.js-case-slide');
	this.elements.$currentSlide = $();

	this.currentSlideIndex = -1;
	this.slidesLength = this.elements.$slides.length;
	this.audioPlayer = new Audio();
	this.currentTimeout = undefined;
	this.caseResult = [];
	this.questionsCount = 0;
	this.context = options.context;
	this.questions = options.context.course;

	this.options = {};
	this.options.musicTimeout = 2000;
	this.options.musicWithoutTimeout = 3000;
	this.options.music = !!options.music;

	this.callback = options.callback;


	$.each(this.questions, function(index, question) {
		if (question.question) {
			that.questionsCount++;
		}
	});

	this.bindEvents();

	this.nextSlide();
};

Case.prototype.bindEvents = function() {
	this.elements.$navigationPrev.on('click', this.prevSlide.bind(this));
	this.elements.$navigationNext.on('click', this.nextSlide.bind(this));
};

Case.prototype.nextSlide = function() {
	if (this.currentSlideIndex + 1 < this.slidesLength) {
		this.hideSlide();
		this.currentSlideIndex++;
		this.elements.$currentSlide = this.getSlide();
		this.elements.$currentPage.text(this.currentSlideIndex + 1);
		this.showSlide();
	} else {
		this.finishCase();
	}
};

Case.prototype.prevSlide = function() {
	if (this.currentSlideIndex > 0) {
		this.hideSlide();
		this.currentSlideIndex--;
		this.elements.$currentSlide = this.getSlide();
		this.elements.$currentPage.text(this.currentSlideIndex + 1);
		this.showSlide();
	}
};

Case.prototype.restartCase = function() {
	this.currentSlideIndex = -1;
	this.elements.$currentSlide = $();
	this.nextSlide();
};

Case.prototype.finishCase = function() {
	var that = this,
		result,
		complete,
		trueQuestions = 0;

	$.each(this.caseResult, function(index, res) {
		if (res) {
			trueQuestions++;
		}
	});

	result = Math.ceil(100 / this.questionsCount * trueQuestions) || 0;

	if (result > CONST.CASE_COMPLETE) {
		complete = true;

		modal({
			title: 'Поздравляем! Вы успешно прошли кейс!',
			progress: {
				result: result
			},
			buttons: [{
				text: 'Повторить',
				type: 'restart',
				onClick: function() {
					that.hideSlide();
					that.restartCase();
				}
			}, {
				text: 'Продолжить',
				type: 'continue',
				onClick: function() {
					mainView.router.back();
				}
			}]
		});
	} else {
		complete = false;

		modal({
			title: 'К сожалению, Вы не справились!',
			progress: {
				result: result
			},
			textAfter: 'Для успешного прохождения кейса Вам необходимо набрать более ' + CONST.CASE_COMPLETE + '%. Вы можете вернуться к теории либо попробовать пройти кейс заново.',
			buttons: [{
				text: 'Пройти заново',
				type: 'restart',
				onClick: function() {
					that.hideSlide();
					that.restartCase();
				}
			}, {
				text: 'Вернуться к теории',
				type: 'continue',
				onClick: function() {
					mainView.router.back();
				}
			}]
		});
	}
};

Case.prototype.hideSlide = function() {
	var $sortable = $(this.elements.$currentSlide.find('.js-case-question-sort-block'));

	this.audioPlayer.pause();
	clearTimeout(this.currentTimeout);
	this.currentTimeout = undefined;

	this.elements.$currentSlide.find('.js-case-comment, .case-question-box, .js-message-bubble').addClass('hide');
	this.elements.$currentSlide.find('.js-popover-result').remove();

	$(this.elements.$currentSlide.find('input[type="checkbox"], input[type="radio"]')).icheck('unchecked');
	this.elements.$currentSlide.find('.js-question-submit').off('click').removeClass('disable');

	$sortable.sortable('destroy');
	$sortable.html($sortable.data('cache'));
	this.elements.$currentSlide.addClass('hide');
};

Case.prototype.showSlide = function() {
	var that = this,
		slideType = this.elements.$currentSlide.data('slide-type');

	this.elements.$currentSlide.removeClass('hide');

	switch (slideType) {
		case 'dialog':
			that.initDialogSlide();

			break;

		case 'radio':
			that.initRadioSlide();

			break;

		case 'checkbox':
			that.initCheckboxSlide();

			break;

		case 'sort':
			that.initSortableSlide();

			break;

		case 'comment':
			that.initCommentSlide();

			break;

		case 'demo':
			that.initDemoSlide();

			break;

		case 'screenshot':
			that.initScreenshotSlide();

			break;
	}
};

Case.prototype.initDialogSlide = function() {
	var that = this,
		$messages = this.elements.$currentSlide.find('.js-message-bubble');

	clearTimeout(that.currentTimeout);
	that.currentTimeout = setTimeout(function() { // delay for animation
		async.eachSeries($messages, function(message, callback) {
			var $message = $(message),
				audioPath = $message.data('audio');

			$message.removeClass('hide').addClass('animated fadeInUp');

			that.playAudio(audioPath, function() {
				callback();
			}, function() {
				callback('audio error!');
			});
		}, function(err) {
			if (err) {
				console.log(err);
			}

			that.nextSlide();
		});
	}, 1000);
};

Case.prototype.initRadioSlide = function() {
	var that = this,
		$questionBox = this.elements.$currentSlide.find('.case-question-box'),
		audioPath = $questionBox.data('audio');

	clearTimeout(that.currentTimeout);
	that.currentTimeout = setTimeout(function() { // delay for animation
		$questionBox.removeClass('hide').addClass('animated fadeInUp');

		that.elements.$currentSlide.find('.js-question-submit').on('click', function(event) {
			var $this = $(this);

			event.preventDefault();

			if ($this.hasClass('disabled')) {
				return false;
			}

			that.checkSlide(that.elements.$currentSlide, 'radio');
		});

		that.playAudio(audioPath, function() {}, function() {
			console.log('audio error!');
		});
	}, 1000);
};

Case.prototype.initCommentSlide = function() {
	var that = this,
		$comment = this.elements.$currentSlide.find('.js-case-comment');

	clearTimeout(that.currentTimeout);
	that.currentTimeout = setTimeout(function() { // delay for animation
		var audioPath = $comment.data('audio');

		$comment.removeClass('hide').addClass('animated fadeInDown');

		that.playAudio(audioPath, function() {
			that.nextSlide();
		}, function() {
			console.log('audio error!');
			that.nextSlide();
		});
	}, 1000);
};

Case.prototype.initCheckboxSlide = function() {
	var that = this,
		$questionBox = this.elements.$currentSlide.find('.case-question-box'),
		audioPath = $questionBox.data('audio');

	clearTimeout(that.currentTimeout);
	that.currentTimeout = setTimeout(function() { // delay for animation
		$questionBox.removeClass('hide').addClass('animated fadeInUp');

		that.elements.$currentSlide.find('.js-question-submit').on('click', function(event) {
			var $this = $(this);

			event.preventDefault();

			if ($this.hasClass('disabled')) {
				return false;
			}

			that.checkSlide(that.elements.$currentSlide, 'checkbox');
		});

		that.playAudio(audioPath, function() {}, function() {
			console.log('audio error!');
		});
	}, 1000);
};

Case.prototype.initDemoSlide = function() {
	var that = this,
		$questionBox = this.elements.$currentSlide.find('.case-question-box'),
		$submitDemo = $(this.elements.$currentSlide.find('.js-demo-submit'));

	clearTimeout(that.currentTimeout);
	that.currentTimeout = setTimeout(function() { // delay for animation
		$questionBox.removeClass('hide').addClass('animated fadeInUp');
	}, 1000);

	$submitDemo.on('click', function() {
		that.nextSlide();
	});
};

Case.prototype.initSortableSlide = function() {
	var that = this,
		$questionBox = this.elements.$currentSlide.find('.case-question-box'),
		audioPath = $questionBox.data('audio');

	clearTimeout(that.currentTimeout);
	that.currentTimeout = setTimeout(function() { // delay for animation
		$questionBox.removeClass('hide').addClass('animated fadeInUp');

		that.elements.$currentSlide.find('.js-question-submit').on('click', function(event) {
			var $this = $(this);

			event.preventDefault();

			if ($this.hasClass('disabled')) {
				return false;
			}

			that.checkSlide(that.elements.$currentSlide, 'sort');
		});

		that.playAudio(audioPath, function() {}, function() {
			console.log('audio error!');
		});
	}, 1000);

	var $sortable = $($questionBox)
		.find('.js-case-question-sort-block')
		.sortable({
			axis: 'y',
			scroll: false
		});

	$sortable.data('cache', $sortable.html());
};

Case.prototype.initScreenshotSlide = function() {
	var that = this,
		$screenshot = this.elements.$currentSlide.find('.js-screenshot-block'),
		imagePath = $screenshot.data('image');

	clearTimeout(that.currentTimeout);
	that.currentTimeout = setTimeout(function() { // delay for animation
		modalImage({
			image: imagePath,
			closeCallback: function() {
				that.nextSlide();
			}
		});
	}, 1000);
};

Case.prototype.resetDialogSlide = function() {
	var that = this,
		$messages = this.elements.$currentSlide.find('.js-message-bubble');

	$messages.addClass('hide');
};

Case.prototype.checkSlide = function($page, questionType) {
	var that = this,
		resultFlag = true,
		$submitButton = $($page.find('.js-question-submit')).addClass('disable');

	switch (questionType) {
		case 'checkbox':
			$($page.find('input[type="checkbox"]')).icheck('disabled');
			$.each($page.find('input[type="checkbox"]:checked'), function(index, input) {
				var $input = $(input);

				if ($input.attr('abs') != 'abs') {
					resultFlag = false;
				}
			});

			resultFlag && $.each($page.find('input[abs="abs"]'), function(index, input) {
				var $input = $(input);

				if (!$input.is(':checked')) {
					resultFlag = false;
				}
			});

			break;

		case 'radio':
			var $input = $page.find('input[abs="abs"]');

			$($page.find('input[type="radio"]')).icheck('disabled');

			if (!$input.is(':checked')) {
				resultFlag = false;
			}

			break;

		case 'sort':
			var $variants = $page.find('.js-case-question-sort-variant');

			$($page.find('.js-case-question-sort-block')).sortable("disable");
			$.each($variants, function(index, variant) {
				var $variant = $(variant);

				if ($variant.data('abs') != index + 1) {
					resultFlag = false;
				}
			});

			break;
	}

	var $popoverResult = $('<div class="popover-result js-popover-result"><div class="popover-header js-popover-header"></div><div class="popover-body js-popover-body"></div></div>'),
		message = '';

	if (resultFlag) {
		$popoverResult.find('.js-popover-header').text('Совершенно верно!');
		$popoverResult.addClass('m-true');
	} else {
		$popoverResult.find('.js-popover-header').text('Вы ответили неверно!');
		$popoverResult.addClass('m-false');
		message = $submitButton.data('feedback');
	}

	that.caseResult.push(resultFlag);

	$popoverResult.find('.js-popover-body').text(message);
	$popoverResult.insertAfter($submitButton);
	$($popoverResult).css({
		'top': ($submitButton.position().top - $popoverResult.outerHeight() - $submitButton.outerHeight()) + 'px',
		'left': ($submitButton.position().left) + 'px'
	});

	var audioPath = $submitButton.data('feedback-audio');

	that.playAudio(audioPath, function() {
		that.nextSlide();
	}, function() {
		console.log('audio error!');

		that.nextSlide();
	});
}

Case.prototype.getSlide = function(index) {
	return this.elements.$slides.eq(typeof index == 'undefined' ? this.currentSlideIndex : index);
};

Case.prototype.playAudio = function(path, callbackSuccess, callbackError) {
	var that = this;

	if (this.options.music && path) {
		that.audioPlayer.src = path;

		that.audioPlayer.onended = function() {
			clearTimeout(that.currentTimeout);
			that.currentTimeout = setTimeout(function() {
				callbackSuccess();
			}, that.options.musicTimeout);
		};
		that.audioPlayer.onerror = callbackError;
		that.audioPlayer.play();
	} else {
		clearTimeout(that.currentTimeout);
		that.currentTimeout = setTimeout(function() {
			callbackSuccess();
		}, that.options.musicWithoutTimeout);
	}
};