function GroupProjectBlock(runtime, element) {

  var get_from_node = function(selector, default_value){
    var the_node = $(selector, element);
    return (the_node.length > 0) ? the_node.html() : default_value;
  };
  var DATA_PRESENT_SUBMIT = get_from_node('.data-present-button-text', 'Resubmit');
  var NO_DATA_PRESENT_SUBMIT = get_from_node('.no-data-button-text', 'Submit');

  var message_box = $('.message', element).appendTo($(document.body));
  message_box.on('click', '.button, .close-box', function(){
    message_box.hide();
  })

  var show_message = function(msg){
    message_box.find('.message_text').html(msg);
    message_box.show();
  }

  var mean = function(value_array){
    var sum = 0;
    var count = value_array.length;
    if(count < 1){
      return null;
    }

    for(var i=0; i<count; ++i){
      sum += parseFloat(value_array[i]);
    }

    return sum / count;
  }

  var load_data_into_form = function(form_node, data_for_form){
    form_node.find('.answer').val(null);
    for(data_item in data_for_form){
      form_node.find('button.submit').html(DATA_PRESENT_SUBMIT);
      // NOTE: use of ids specified by designer here
      var $form_item = form_node.find("#" + data_item);
      $form_item.val(data_for_form[data_item]);
    }
  }

  var load_my_feedback_data = function(section_node, data){
    // Clean existing values
    $('.answer-value', section_node).empty();

    for(data_item in data){
      // either a place witin to list it or the outer location
      var fill_field = $('#list_' + data_item, section_node);
      if(fill_field.length < 1){
        fill_field = $('#assess_' + data_item, section_node);
      }
      var data_class = fill_field.data('class');
      for(var i=0; i<data[data_item].length; ++i){
        var node = $("<div/>");
        if(data_class && data_class.length > 0){
          node.addClass(data_class);
        }
        node.html(data[data_item][i]);
        fill_field.append(node);
      }

      var mean_field = $('#mean_' + data_item, section_node);
      mean_field.text(Math.round(mean(data[data_item])));
    }
  }

  var _load_data = function (handler_name, args, form_node, post_data_fn){
    $('.group-project-xblock-wrapper', element).addClass('waiting');
    form_node.find('.editable').attr('disabled', 'disabled');
    form_node.find('.answer').val(null);
    form_node.find('button.submit').html(NO_DATA_PRESENT_SUBMIT);
    $.ajax({
      url: runtime.handlerUrl(element, handler_name),
      data: args,
      dataType: 'json',
      success: function(data){
        if(data.result && data.result == "error"){
          if(data.msg){
            show_message(data.msg);
          }
          else{
            show_message('We encountered an error loading feedback.');
          }
        }
        else{
          post_data_fn(form_node, data);
        }
      },
      error: function(data){
        show_message('We encountered an error loading feedback.');
      }
    }).done(function(){
      $('.group-project-xblock-wrapper', element).removeClass('waiting');
      form_node.find('.editable').removeAttr('disabled');
    });
  }

  var load_data_for_peer = function (peer_id){
    _load_data('load_peer_feedback', 'peer_id=' + peer_id, $('.peer_review', element), load_data_into_form);
  }

  var load_data_for_other_group = function (group_id){
    _load_data('load_other_group_feedback', 'group_id=' + group_id, $('.other_group_review', element), load_data_into_form);
  }

  $('form.peer_review, form.other_group_review', element).on('submit', function(ev){
    ev.preventDefault();
    var $form = $(this);

    $form.find(':submit').prop('disabled', true);
    items = $form.serializeArray();
    data = {}
    $.each(items, function(i,v){
      data[v.name] = v.value;
    });

    $.ajax({
      type: $form.attr('method'),
      url: runtime.handlerUrl(element, $form.attr('action')),
      data: JSON.stringify(data),
      success: function(data){
        var msg = 'Thanks for your feedback!';
        if(data.msg){
          msg = data.msg;
        }
        show_message(msg);
      },
      error: function(data){
        show_message('We encountered an error saving your feedback.');
      },
      complete: function(data){
        $form.find(':submit').prop('disabled', false).html(DATA_PRESENT_SUBMIT);
      }
    });

    return false;
  });

  var peers = JSON.parse($('.peer_group', element).html());
  var peer_node = function(peer){
    var pn = $('<a class="select_peer" />');
    var pi = $('<img class="avatar" />');
    if(peer.avatar_url){
      pi.attr('src', peer.avatar_url);
    }
    pn.attr('title', peer.username);
    pn.data('id', peer.id);
    pn.data('username', peer.username)
    pn.append(pi);

    return pn;
  }

  for(var i=0; i < peers.length; ++i){
    $('.peers', element).append(peer_node(peers[i]));
  }

  var groups = JSON.parse($('.assess_groups', element).html());
  var group_node = function(group){
    var gn = $('<a class="select_group" />');
    var gi = $('<span class="avatar"><i class="fa fa-users mk-icon-groupworknav" /></span>');
    gn.data('id', group.id);
    gn.append(gi);

    return gn;
  }

  for(var i=0; i < groups.length; ++i){
    $('.other_groups', element).append(group_node(groups[i]));
  }


  var step_map = JSON.parse($('.step_map', element).html());

  $(document).on('select_stage', function(target, selected_step_id){
    // Hide show correct content
    $('.revealer').removeClass('selected');
    $(this).addClass('selected');

    $('.activity_section').hide();

    // NOTE: use of ids specified by designer here
    $('#activity_' + selected_step_id).show();

    // Update step makers
    var step_pn = step_map[selected_step_id];
    $('.page-to.previous, .page-to.next', element).attr('title', '').off('click').removeAttr('href');
    if(step_pn.prev){
      var prev = step_map[step_pn.prev];
      $('.page-to.previous', element)
        .attr('title', prev.name)
        .on('click', function(){$("#" + step_pn.prev).click();}).attr('href', '#');
    }
    if(step_pn.next){
      var next_step = step_map[step_pn.next];
      if(next_step['restrict_message']){
        $('.page-to.next', element).attr('title', next_step['restrict_message']);
      }
      else{
        $('.page-to.next', element)
          .attr('title', next_step.name)
          .on('click', function(){$("#" + step_pn["next"]).click();}).attr('href', '#');
      }
    }
  });

  $('.revealer').on('click', function(ev){
    $(document).trigger('select_stage', $(this).attr('id'));

    ev.preventDefault();
    return false;
  });

  $('.view_feedback').on('click', function(ev){
    $('.feedback_sections').hide();
    $('.view_feedback').removeClass('selected');
    var showid = $(this).data('showid');
    $('.' + showid, element).show();
    $(this).addClass('selected');

    if(showid == "cohort_feedback"){
      _load_data('load_my_group_feedback', null, $('.cohort_feedback', element), load_my_feedback_data);
    }
    else{
      _load_data('load_my_peer_feedback', null, $('.team_feedback', element), load_my_feedback_data);
    }

    ev.preventDefault();
    return false;
  });

  $('.select_peer').on('click', function(ev){
    var $this = $(this);
    $('.select_peer,.select_group').removeClass('selected');
    $this.addClass('selected');
    $('.other_group_review', element).hide();
    $('.peer_review', element).show();
    $('.peer_id', element).attr('value', $this.data('id'));
    $('.username', element).text($this.data('username'));
    load_data_for_peer($this.data('id'));

    ev.preventDefault();
    return false;
  });

  $('.select_group').on('click', function(ev){
    $('.select_peer,.select_group').removeClass('selected');
    $(this).addClass('selected');
    $('.other_group_review', element).show();
    $('.peer_review', element).hide();
    $('.group_id', element).attr('value', $(this).data('id'));
    $('.other_submission_links', element).empty().hide();
    load_data_for_other_group($(this).data('id'));

    ev.preventDefault();
    return false;
  });

  // activate the first step
  $(document).trigger("steps_available", step_map);
  $(document).trigger("select_stage", step_map["default"]);

  var upload_form = $('.upload_form', element).appendTo($(document.body));
  var failed_uploads = [];

  var upload_data = {
    dataType: 'json',
    url: runtime.handlerUrl(element, "upload_submission"),
    add: function(e, data){
      var target_form = $(e.target);
      $('.' + data.paramName + '_name', target_form).val(data.files[0].name);
      $('.' + data.paramName + '_label', target_form).text("Update");
      $('.' + data.paramName + '_progress', target_form).css({width: '0%'}).removeClass('complete failed');
      $('.' + data.paramName + '_progress_box', target_form).css({visibility: 'visible'});

      $(document).one('perform_uploads', function(ev){
        data.submit();
      });

      // enable upload button & reset progress
      $('.do_upload', upload_form).removeProp('disabled');
    },
    progress: function(e, data){
      var target_form = $(e.target);
      var percentage = parseInt(data.loaded / data.total * 100, 10);
      $('.' + data.paramName + '_progress', target_form).css('width', percentage + '%');
    },
    done: function(e, data){
      var target_form = $(e.target);
      $('.' + data.paramName + '_progress', target_form).css('width', '100%').addClass('complete');
      var input = $('.' + data.paramName + '_name', target_form);
      input.attr('data-original-value', input.val());
    },
    stop: function(e){
      $('.do_upload', upload_form).prop('disabled', true).css('cursor', 'pointer');
      $('.group_submissions', element).empty();
      $.ajax({
        url: runtime.handlerUrl(element, "refresh_submission_links"),
        dataType: 'json',
        success: function(data){
          $('.group_submissions', element).html(data.html);
        },
        error: function(data){
          show_message('We encountered an error.');
        }
      });

      if (failed_uploads.length <= 0) {
        setTimeout(function(){
          upload_form.hide();
        }, 1000);
      }
      failed_uploads = [];
    },
    fail: function(e, data) {
      var target_form = $(e.target);
      $('.' + data.paramName + '_progress', target_form).css('width', '100%').addClass('failed');
      failed_uploads.push(data.files[0].name);
      var message = data.jqXHR.responseJSON ? data.jqXHR.responseJSON.message : data.jqXHR.responseText;
      target_form.prop('title', message);
    }
  };

  $('.uploader', upload_form).fileupload(upload_data);

  $('.cancel_upload', upload_form).on('click', function(){
    upload_form.hide();
  })
  $('.do_upload', upload_form).on('click', function(){
    $('.do_upload', upload_form).prop('disabled', true).css('cursor', 'wait');
    $(document).trigger('perform_uploads');
  })

  $('.show_upload_form', element).on('click', function(){
    // upload button initially disabled
    $('.do_upload', upload_form).prop('disabled', true).css('cursor', 'pointer');
    $('.file-progress-box', upload_form).css('visibility', 'hidden');
    $('.file-progress', upload_form).removeClass('complete failed');

    // reset file input fields
    var fields = upload_form.find('.upload_item input');
    fields.each(function(i,v) {
      var field = $(v);
      field.val(field.attr('data-original-value'));
    });

    upload_form.show();
  });

  $('.view_other_submissions', element).on('click', function(){
    var $flyup = $('.other_submission_links', element);
    var is_visible = $flyup.is(":visible");
    $flyup.empty().hide();
    if(!is_visible){
      var selected_group_id = $('.select_group.selected').data("id");
      $.ajax({
        url: runtime.handlerUrl(element, "other_submission_links"),
        data: {group_id: selected_group_id},
        dataType: 'json',
        success: function(data){
          $flyup.html(data.html).show();
        },
        error: function(data){
          show_message('We encountered an error.');
        }
      });
    }
  });

  // Activate the first peer, or the first group if no peers
  $(function(){
    var select_from = $('.select_peer, .select_group');
    if(select_from.length > 0){
      select_from[0].click();
    }
  })
}
