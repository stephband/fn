
group('Time', function(test, log) {
	var Time = window.Fn;

	test('.addDate(datetime, date)', function(equals, done) {
		var date = new Date(Date.UTC(2018, 0, 1));
		// 2018-01-01
		equals(+new Date(Date.UTC(2018, 0, 1, 1, 28)),    +Time.addDate("01:28", date));
		equals(+new Date(Date.UTC(2017, 11, 31, 22, 32)), +Time.addDate("-01:28", date));
		equals(+new Date(Date.UTC(2018, 0, 2, 1, 28)),    +Time.addDate("25:28", date));
		equals(+new Date(Date.UTC(2017, 11, 30, 22, 32)), +Time.addDate("-25:28", date));

		equals(+new Date(Date.UTC(2019, 0, 1)), +Time.addDate("+0001-00-00", date));
		equals(+new Date(Date.UTC(2017, 0, 1)), +Time.addDate("-0001-00-00", date));
		equals(+new Date(Date.UTC(2016, 10, 29, 22, 58, 58, 999)), +Time.addDate("-0001-01-01T01:01:01.001", date));
		equals(+new Date(Date.UTC(2016, 10, 29, 22, 58, 58, 985)), +Time.addDate("-0001-01-01T01:01:01.015", date));

		done();
	});


	test('.add(datetime, date)', function(equals, done) {
		var date = new Date(Date.UTC(2018, 0, 1));
		// 2018-01-01
		equals(+new Date(Date.UTC(2018, 0, 1, 1, 28)),    +Time.addDate("01:28", date));
		equals(+new Date(Date.UTC(2017, 11, 31, 22, 32)), +Time.addDate("-01:28", date));
		equals(+new Date(Date.UTC(2018, 0, 2, 1, 28)),    +Time.addDate("25:28", date));
		equals(+new Date(Date.UTC(2017, 11, 30, 22, 32)), +Time.addDate("-25:28", date));

		equals(+new Date(Date.UTC(2019, 0, 1)), +Time.addDate("0001-00-00", date));
		equals(+new Date(Date.UTC(2017, 0, 1)), +Time.addDate("-0001-00-00", date));

		done();
	});

	test('.parseTime()', function(equals, done) {
		// We don't support hours-only times, even though they are ISO8601
		//equals(3600, Time.parseTime('01'));
		equals(5280, Time.parseTime("01:28"));
		equals(5331, Time.parseTime("01:28:51"));
		equals(5331, Time.parseTime("01:28:51.000"));

		//equals(-3600, Time.parseTime('-01'));
		equals(-5280, Time.parseTime("-01:28"));
		equals(-5331, Time.parseTime("-01:28:51"));
		equals(-5331, Time.parseTime("-01:28:51.000"));

		done();
	});

	test('.formatTime(formatstring, time)', function(equals, done) {
		equals("01:28",         Time.formatTime('hh:mm', "01:28:23.890674"));
		equals("01:28:23",      Time.formatTime('hh:mm:ss', "01:28:23.890674"));
		equals("01:28:23.890",  Time.formatTime('hh:mm:ss.ms', "01:28:23.890674"));
		equals("01:28:23.890674", Time.formatTime('hh:mm:sss', "01:28:23.890674"));
		equals("00-01:28:23.890674", Time.formatTime('dd-hh:mm:sss', "01:28:23.890674"));

		equals("01:28",         Time.formatTime('hh:mm', 5331));
		equals("01:28:51",      Time.formatTime('hh:mm:ss', 5331));
		equals("01:28:51.000",  Time.formatTime('hh:mm:ss.ms', 5331));
		equals("00-01:28:51",   Time.formatTime('dd-hh:mm:sss', 5331));

		equals("-01:28",        Time.formatTime('+-hh:mm', -5331));
		equals("-01:28:51",     Time.formatTime('+-hh:mm:ss', -5331));
		equals("-01:28:51.000", Time.formatTime('+-hh:mm:ss.ms', -5331));
		equals("-00-01:28:51",  Time.formatTime('+-dd-hh:mm:sss', -5331));

		equals("03",            Time.formatTime('www', 2000000));
		equals("23",            Time.formatTime('dd', 2000000));
		equals("254",           Time.formatTime('dd', 22000000));

		done();
	});

	test('.addTime(time1, time2)', function(equals, done) {
		equals(7200,      Time.addTime('01:00', '01:00'));
		equals(3660,      Time.addTime('01:00', '00:01'));
		equals(4810,      Time.addTime('01:00:09', '00:20:01.000000'));

		equals(11580,     Time.addTime('01:45', 5280));
		equals(11651,     Time.addTime('01:45:20', 5331));
		equals(11651.999, Time.addTime('01:45:20.999', 5331));

		equals(0,         Time.addTime('-01:00', '01:00'));
		equals(-3540,     Time.addTime('-01:00', '00:01'));
		equals(-3600,     Time.addTime('-01:00', '00:00:00.000000'));

		done();
	});

	test('.floorTime(token, time)', function(equals, done) {
		equals(604800,    Time.floorTime('week',   '179:22:33.445566'));
		equals(604800,    Time.floorTime('day',    '179:22:33.445566'));
		equals(644400,    Time.floorTime('hour',   '179:22:33.445566'));
		equals(645720,    Time.floorTime('minute', '179:22:33.445566'));
		equals(645753,    Time.floorTime('second', '179:22:33.445566'));

		done();
	});
});
